import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { jwtVerify, decodeProtectedHeader, importSPKI, importJWK } from "jose";

export interface Env {
    SUPABASE_JWT_SECRET: string;
    SEVALLA_S3_ENDPOINT: string;
    SEVALLA_S3_ACCESS_KEY_ID: string;
    SEVALLA_S3_SECRET_ACCESS_KEY: string;
    SEVALLA_S3_BUCKET_NAME: string;
    SEVALLA_PUBLIC_URL_PREFIX: string; // e.g. https://pub-xyz.r2.dev or custom domain
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Fallback key provided by user (PEM format is more reliable for importSPKI)
// Constructed from JWK: x="XYeScStg1SvJZ5supHO90eTZ2EwklO0xtwgwpwhRLb8", y="I_fiaLfX6yhuJNBRffvYNKu8hlZm3rIos7La8TZorAY"
const FALLBACK_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEXYeScStg1SvJZ5supHO90eTZ2Ewk
lO0xtwgwpwhRLb8i/2IotfrK24k0FF9+9g0q7yGVmbeuKizsttxNmisA
-----END PUBLIC KEY-----`;

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }

        const token = authHeader.replace("Bearer ", "");

        try {
            const header = decodeProtectedHeader(token);
            const alg = header.alg || 'HS256';

            let key: any;
            let userId: string | undefined;

            if (alg.startsWith('HS')) {
                // Symmetric key (HMAC)
                try {
                    const binary = atob(env.SUPABASE_JWT_SECRET.trim());
                    key = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        key[i] = binary.charCodeAt(i);
                    }
                } catch (e) {
                    key = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
                }
            } else {
                // Asymmetric key (RSA/ECDSA)
                if (alg === 'ES256') {
                    // For ES256, manually verify the JWT using Web Crypto API
                    const jwk = {
                        kty: "EC",
                        crv: "P-256",
                        x: "XYeScStg1SvJZ5supHO90eTZ2EwklO0xtwgwpwhRLb8",
                        y: "I_fiaLfX6yhuJNBRffvYNKu8hlZm3rIos7La8TZorAY",
                        ext: true,
                        key_ops: ["verify"]
                    };

                    const cryptoKey = await crypto.subtle.importKey(
                        "jwk",
                        jwk,
                        { name: "ECDSA", namedCurve: "P-256" },
                        false,
                        ["verify"]
                    );

                    // Manually verify the JWT
                    const parts = token.split('.');
                    if (parts.length !== 3) {
                        throw new Error('Invalid JWT format');
                    }

                    const signatureInput = parts[0] + '.' + parts[1];
                    const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

                    const isValid = await crypto.subtle.verify(
                        { name: "ECDSA", hash: "SHA-256" },
                        cryptoKey,
                        signature,
                        new TextEncoder().encode(signatureInput)
                    );

                    if (!isValid) {
                        throw new Error('Invalid JWT signature');
                    }

                    // Decode payload manually
                    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
                    const payload = JSON.parse(payloadJson);
                    userId = payload.sub;

                    if (!userId) {
                        throw new Error("Invalid user ID");
                    }

                    // Debug: Log environment variables (masked) to diagnose missing credentials
                    console.log("Debug: Checking credentials...");
                    console.log(`Endpoint present: ${!!env.SEVALLA_S3_ENDPOINT}`);
                    console.log(`Access Key present: ${!!env.SEVALLA_S3_ACCESS_KEY_ID}`);
                    if (env.SEVALLA_S3_ACCESS_KEY_ID) console.log(`Access Key length: ${env.SEVALLA_S3_ACCESS_KEY_ID.length}`);
                    console.log(`Secret Key present: ${!!env.SEVALLA_S3_SECRET_ACCESS_KEY}`);
                    if (env.SEVALLA_S3_SECRET_ACCESS_KEY) console.log(`Secret Key length: ${env.SEVALLA_S3_SECRET_ACCESS_KEY.length}`);

                    if (!env.SEVALLA_S3_ACCESS_KEY_ID || !env.SEVALLA_S3_SECRET_ACCESS_KEY) {
                        throw new Error("Missing S3 credentials in environment variables.");
                    }

                    // Skip to S3 logic
                    const s3Client = new S3Client({
                        region: "auto",
                        endpoint: env.SEVALLA_S3_ENDPOINT,
                        credentials: {
                            accessKeyId: env.SEVALLA_S3_ACCESS_KEY_ID,
                            secretAccessKey: env.SEVALLA_S3_SECRET_ACCESS_KEY,
                        },
                    });

                    const body = await request.json() as { method: "PUT", fileName: string };

                    if (body.method === "PUT") {
                        const timestamp = Date.now();
                        const safeFileName = body.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
                        const keyPath = `uploads/${userId}/${timestamp}_${safeFileName}`;

                        const command = new PutObjectCommand({
                            Bucket: env.SEVALLA_S3_BUCKET_NAME,
                            Key: keyPath,
                            ContentType: "image/jpeg",
                        });

                        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
                        const publicUrl = `${env.SEVALLA_PUBLIC_URL_PREFIX.replace(/\/$/, "")}/${keyPath}`;

                        return new Response(JSON.stringify({ uploadUrl, publicUrl, key: keyPath }), {
                            headers: { ...corsHeaders, "Content-Type": "application/json" },
                        });
                    }

                    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
                } else {
                    // For other algorithms, try parsing env var
                    const secretString = env.SUPABASE_JWT_SECRET.trim();

                    if (secretString.includes('PUBLIC KEY')) {
                        key = await importSPKI(secretString, alg);
                    } else {
                        throw new Error(`Unsupported algorithm ${alg} without PEM key`);
                    }
                }
            }

            // Only reach here for non-ES256
            if (alg !== 'ES256') {
                const { payload } = await jwtVerify(token, key, {
                    algorithms: [alg],
                });
                userId = payload.sub;
            }

            if (!userId) {
                return new Response("Invalid user ID", { status: 403, headers: corsHeaders });
            }

            const s3Client = new S3Client({
                region: "auto",
                endpoint: env.SEVALLA_S3_ENDPOINT,
                credentials: {
                    accessKeyId: env.SEVALLA_S3_ACCESS_KEY_ID,
                    secretAccessKey: env.SEVALLA_S3_SECRET_ACCESS_KEY,
                },
            });

            const body = await request.json() as { method: "PUT", fileName: string };

            if (body.method === "PUT") {
                const timestamp = Date.now();
                const safeFileName = body.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
                const key = `uploads/${userId}/${timestamp}_${safeFileName}`;

                const command = new PutObjectCommand({
                    Bucket: env.SEVALLA_S3_BUCKET_NAME,
                    Key: key,
                    ContentType: "image/jpeg",
                });

                const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

                // Construct the public URL for reading
                const publicUrl = `${env.SEVALLA_PUBLIC_URL_PREFIX.replace(/\/$/, "")}/${key}`;

                return new Response(JSON.stringify({ uploadUrl, publicUrl, key }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            return new Response("Method not allowed", { status: 405, headers: corsHeaders });

        } catch (e: any) {
            console.error("Worker error:", e);
            return new Response(`Error: ${e.message}`, { status: 403, headers: corsHeaders });
        }
    },
};
