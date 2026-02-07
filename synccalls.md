# Sync Triggers (Push/Pull)

This document lists all events that trigger a **Push** (uploading local changes) or **Pull** (downloading remote updates) in the Silvers app.

### 1. After Local Changes (Push Only)
The app triggers a `push()` in the background to send specific changes to the cloud immediately after saving them locally:
*   **Hitting "Done" on Create/Edit**: After saving a new or existing Product, Category, Vendor, or Option.
*   **Confirming Deletion**: After confirming the removal of any item.
*   **Placing an Order**: Immediately after an order is created locally on the Checkout screen.

### 2. App Lifecycle Events (Pull + Push)
The app performs a full `sync()` (pulling first, then pushing) during these state changes:
*   **App Launch**: As soon as the app starts and the user is authenticated.
*   **Return to App (Foregrounding)**: Every time you switch back to the Silvers app from another app or the phone's home screen.
*   **Sign-Out**: A final `push()` is attempted before logout to ensure local data is not lost.

### 3. Automatic Background Tasks (Pull + Push)
*   **Periodic Heartbeat**: While the app is open, it triggers a full `sync()` every **5 minutes**.

### 4. Manual Triggers (Pull + Push)
*   **Pull-to-Refresh**: On the **Catalogue (Nodes)** screen, swiping down on the list forces an immediate full synchronization.

---

### Summary Table
| Event | Action | Trigger Point |
| :--- | :--- | :--- |
| **Mutations** | Push | Create/Edit/Delete "Done" button |
| **Ordering** | Push | "Place Order" button |
| **Lifecycle** | Sync | App Start & App Foregrounding |
| **Heartbeat** | Sync | Every 5 minutes (automatic) |
| **Manual** | Sync | Pull-to-refresh on Catalogue screen |
| **Logout** | Push | "Sign Out" button |
