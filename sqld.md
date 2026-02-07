# Self-Hosted libSQL (sqld) Configuration Guide

To enable multi-tenancy (namespaces) and JWT authentication on your self-hosted `sqld` instance, follow these steps.

## 1. Enable Namespaces (Multi-tenancy)

Start `sqld` with the `--enable-namespaces` flag. This allows you to host multiple isolated databases on a single server.

```bash
sqld --enable-namespaces --db-path ./my-databases
```

### 🔗 Connecting to a Namespace
When namespaces are enabled, the database URL determines which namespace you connect to.
- **Subdomain Method (Recommended)**: Use `<namespace>.your-domain.com`.
  - Example: `libsql://my-app.your-server.com` (connects to `my-app` namespace).
- **HTTP Header**: Some clients support sending `x-namespace: my-app` header.

## 2. Enable JWT Authentication

`sqld` uses ED25519 keys for JWT signing and verification.

### Step A: Generate Keys
You need a key pair. The **Private Key** signs tokens (your app uses this). The **Public Key** validates them (`sqld` uses this).

**Using OpenSSL:**
```bash
# Generate key pair
openssl genpkey -algorithm ed25519 -out private_key.pem
openssl pkey -in private_key.pem -pubout -out public_key.pem
```

### Step B: Configure sqld
Start `sqld` pointing to the public key.

```bash
sqld --auth-jwt-key-file ./public_key.pem
```

## 3. Generating Tokens (For your App)

Your application (the "Metadata/Control Plane") needs to mint tokens for users. You can use any standard JWT library.

**Example (Node.js):**
```javascript
import jwt from 'jsonwebtoken';
import fs from 'fs';

const privateKey = fs.readFileSync('private_key.pem');

const token = jwt.sign({
  id: 'user-123',
  // standard claims
}, privateKey, { algorithm: 'EdDSA' });

console.log(token);
// Use this token as EXPO_PUBLIC_TURSO_TOKEN
```

## 🔐 Combined Command
To run with **both** features:

```bash
sqld --enable-namespaces --db-path ./data --auth-jwt-key-file ./public_key.pem --http-listen-addr 0.0.0.0:8080
```

## ❓ Conceptual Clarification

**Q: Is the JWT token generated stored/infused into the namespaces in the self-hosted libSQL?**

**A: No.**

1.  **Stateless Verification**: The token is **NOT stored** in the database or namespace. It is "stateless".
2.  **Cryptographic Trust**: The server holds your **Public Key**. When a user connects, the server checks the token's signature against this key. If the signature is valid, the server trusts the token.
3.  **Access Control**: 
    *   In a standard self-hosted setup, **any valid token** (signed by your private key) proves the user is authorized by *you* (the app owner).
    *   The server allows the connection because it trusts your signature.
    *   **Restricting a Token to a Namespace**: By default, `sqld` checks if the token is valid for the *server*. To strictly limit a token to *only* one specific namespace (db-A) and not another (db-B), you would typically need to rely on your application logic to only give users the correct connection URL, or implement a proxy that checks for a specific "claim" (like `database_id`) before forwarding the request. But out-of-the-box `sqld` primarily validates "Is this a valid user of this server?".

**Q: Can anyone with the namespace URL access the database?**

**A: NO.**
*   Knowing the URL (e.g., `https://my-db.example.com`) only lets them *find* the door.
*   To **open** the door (read/write data), they absolutely need a **valid JWT Token**.
*   Without the token (signed by your private key), the server will reject their connection with `401 Unauthorized`.

---

# 🏨 How it Works (Simplified)

Think of your Self-Hosted setup like a **Private Hotel**.

1.  **The Hotel (Server)**: This is your `sqld` instance running on the internet.
2.  **The Room (Namespace)**: This is the specific database for one user or tenant (e.g., `user-123`).
3.  **The Key Card (JWT Token)**: This is what unlocks the door.

### The Flow:

1.  **Check-In (Login)**:
    *   A user logs into your app with their username/password.
    *   **You (The Manager)** check their ID. If they are who they say they are, you create a digital **Key Card**.
    *   You sign this card with your **Master Stamp (Private Key)**. Only you have this stamp.

2.  **Going to the Room**:
    *   The user walks up to **The Hotel (Your Server)** and tries to open **Room 101 (Their Namespace)**.
    *   The door has a special scanner **(Public Key)**.
    *   The scanner checks the **Key Card**. It looks for your **Master Stamp**.

3.  **Access Granted**:
    *   If the stamp is real? **Green Light**. The door opens.
    *   If they made a fake card or have no card? **Red Light**. The door stays locked.

**Key Takeaway**: Even if a stranger knows the address of the hotel and the room number (`https://db-url.com`), they can't get in without a Key Card stamped by *you*.

### 🪄 The Magic of the Stamp (Digital Signature)

**User Question:** "How does the door verify a dynamic card it has never seen before?"

**Answer:** The door doesn't need to know *what* is on the card. It only checks **WHO made it**.

1.  **The Pair**: When you start, you create two things:
    *   **The Stamp (Private Key)**: Only *you* have this. You keep it safe at your "Check-In Desk" (your Auth Server).
    *   **The Scanner Template (Public Key)**: You give this to the "Door" (your Database Server).

2.  **The Verification**:
    *   The **Scanner Template** is mathematically linked to the **Stamp**.
    *   It can't *make* a stamp, but it can perfectly recognize if a stamp was made by *your* specific Stamp.
    *   It's like a wax seal. The door doesn't need a list of every possible letter you might write. It just looks at the wax seal. **"Is this the King's seal? Yes. Open."**

So, you can print a brand new card for "User #999" right now. The door has never seen "User #999" before, but it sees your **valid Stamp** on the card and opens immediately.

### 🔑 The "Master Key" Logic

Think of it like this:

1.  **You give the Door a RULE, not a list.**
    *   You tell the door: *"Open for ANY card that has my special blue ink signature."* (Public Key)
    *   You keep the **Blue Ink Stamp** (Private Key) in your pocket.

2.  **When a User Checks In:**
    *   You stamp a blank card with your Blue Ink.
    *   You hand it to the user.

3.  **When the User Arrives at the Door:**
    *   The door looks at the card.
    *   It doesn't ask "Is this Dave?"
    *   It asks **"Is this the Blue Ink I was told to trust?"**
    *   If yes -> It opens.

Because **ONLY YOU** have the Blue Ink Stamp, the door knows it's safe to let them in, even if it's the first time it has ever seen that specific card.

### 🧠 How does the Door "Know" the Rule?

**User Question:** "Who tells the server which Blue Ink to trust?"

**Answer:** **YOU DO, when you turn it on.**

Remember the command you ran to start the server?

```bash
sqld --auth-jwt-key-file ./public_key.pem
```

*   `--auth-jwt-key-file`: This is you whispering to the Door:
    > *"Hey Door, here is the Blue Ink sample (`public_key.pem`). Trust ONLY this ink."*

If you restart the server without this flag, the Door forgets the rule and becomes an open door (or a locked one, depending on default). **You define the rule every time you launch the software.**

### 📈 Scaling: What about 1 Million Namespaces?

**User Question:** "If I have 1 million databases (namespaces), do I need to give the server 1 million rules? Do I pre-generate 1 million tokens?"

**Answer:** **NO.** You still only need **ONE Rule**.

1.  **The Rule Stays the Same**:
    *   The server's rule is just: *"Trust anything signed by the Blue Ink."*
    *   It doesn't matter if you have 1 room or 1 million rooms. The **ink** is the same.

2.  **Tokens are "On Demand" (Not Pre-made)**:
    *   You don't stockpile 1 million tokens in a warehouse.
    *   You generate a token **only when a user logs in**.
    *   *Analogy*: Like a parking ticket machine. It doesn't have 1 million tickets pre-printed inside. It prints **one unique ticket** for you right when you push the button.

3.  **The Token Carries the Info**:
    *   When you print the ticket (generate token), you write on it: *"Valid for Room #505 Only"*.
    *   The Server reads the ticket. It sees the **Blue Ink** (trusts it) and reads **"Room #505"** (knows where to let them in).
    *   You don't need to tell the server about Room #505 beforehand. The trusted ticket *tells* the server.

---

# 🏗️ The Full Architecture: Supabase + Cloudflare Workers + Self-Hosted libSQL

Here is the step-by-step flow for an intermediate coder, using **Supabase** (for Auth) and **Cloudflare Workers** (as the Token Mint).

### The Players
1.  **User App**: The mobile/web app.
2.  **Supabase**: Handles "Is this user real?" (Login/Signup).
3.  **Cloudflare Worker**: The "Ticket Office". It holds your **Private Key**.
4.  **Self-Hosted libSQL**: The "Database". It holds your **Public Key**.

### The Flow (Step-by-Step)

#### 1. Login (Authentication)
*   **User**: Enters email/password in your App.
*   **App → Supabase**: "Log me in."
*   **Supabase → App**: "Success! Here is your `User ID` (e.g., `user-123`)."
    *   *Note: This just proves who they are. It doesn't give access to YOUR libSQL database yet.*

#### 2. Get the Access Token (Authorization)
*   **App → Cloudflare Worker**: "Hello, I am `user-123` (proven by Supabase). Please give me a database token."
*   **Cloudflare Worker**:
    1.  Verifies the request (ensures it's really `user-123`).
    2.  Pulls out the **Private Key** (Blue Ink Stamp) from its secure vault (Environment Variables).
    3.  Generates a **JWT Token**.
    4.  Stamps it: *"This is for user-123. They can access Namespace `db-user-123`."*
    5.  Sends the **JWT Token** back to the App.

#### 3. Connect to Database (Access)
*   **App → Self-Hosted libSQL**: "Connect me to `db-user-123`. Here is my **JWT Token**."
*   **libSQL Server**:
    1.  Looks at the Token.
    2.  Checks the signature against its **Public Key**.
    3.  **Match?** YES.
    4.  **Namespace Match?** It sees the token is for `db-user-123` and the user is asking for `db-user-123`.
    5.  **OPEN THE GATES.** The app can now read/write data.

### Why this is secure?
*   **Supabase** handles the hard work of storing passwords and emails.
*   **Cloudflare Worker** is the only one who can *create* tokens. No one else has the Private Key.
*   **libSQL** trusts the Worker because of the Public Key.

---

# 💻 Example Code Flow

Here is how the code actually looks in this flow.

### Step 1: Client App (React Native) - The Login
First, user logs in with Supabase.

```typescript
// 1. Login with Supabase
const { data: { user }, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

if (error) throw error;
// ✅ User is logged in to Supabase.
// We have user.id (e.g., "abc-123")
```

### Step 2: Client App - Get the Database Key
Now, ask your Cloudflare Worker for a database token. You send the Supabase Access Token so the Worker knows it's really them.

```typescript
// 2. Ask Cloudflare Worker for a DB Token
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch('https://my-worker.workers.dev/get-db-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`, // Prove it's me
    'Content-Type': 'application/json'
  }
});

const { dbToken, dbUrl } = await response.json();
// ✅ We now have a signed JWT for libSQL!
```

### Step 3: Cloudflare Worker - The "Ticket Office"
This is the code running on Cloudflare. It verifies the user and signs the token.

```javascript
// Worker Code (Simplified)
export default {
  async fetch(request, env) {
    // A. Verify the user with Supabase
    const authHeader = request.headers.get('Authorization');
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (error || !user) return new Response('Unauthorized', { status: 401 });

    // B. Create the Claims (What is inside the token)
    const payload = {
      sub: user.id,          // User ID
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // Expires in 1 hour
    };

    // C. Sign it with YOUR Private Key (Blue Ink)
    // (Using a library like 'jose' or 'jsonwebtoken')
    const token = await signJwt(payload, env.PRIVATE_KEY);

    // D. Return the token and specific DB URL
    return Response.json({
      dbToken: token,
      dbUrl: `https://${user.id}.your-db-domain.com` // Namespace URL
    });
  }
}
```

### Step 4: Client App - Connect to Database
Finally, use the token to connect.

```typescript
// 3. Connect to libSQL
const db = createClient({
  url: dbUrl,        // https://abc-123.your-db-domain.com
  authToken: dbToken // The signed JWT from Step 2
});

await db.execute("SELECT * FROM todos");
// ✅ Success!
```

### ⚡ Optimization: Do I call the Worker every time?

**User Question:** "Does every sync need to call the Cloudflare Worker? Or does the token last for a while?"

**Answer:** **NO, you do NOT call the Worker every time.**

1.  **Get Token Once (Login)**:
    *   You call the Cloudflare Worker **only once** when the user opens the app or logs in.
    *   The Worker gives you a token that is valid for, say, **1 hour** (or 1 day, user choice).

2.  **Sync Directly (Many Times)**:
    *   For the next hour, your App talks **directly** to the libSQL Database.
    *   It re-uses that same token for 1,000 syncs if it wants to.
    *   The Database checks the expiration date (`exp`) inside the token. If it's still valid, it works.

3.  **Refresh (After Expiration)**:
    *   Only when the token expires (e.g., after 1 hour) does the App go back to the Worker: *"Hey, my key expired, can I have a new one?"*
