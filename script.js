const SUPABASE_URL = 'https://nvedswstitcfawyufoah.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_ttErldmDQCtFDhtOiYF5sQ_y7g4TU18';

const ADMIN_HASH_KEY = "C0sm0s-H4sh-7u2x9pQv5nRm3Wz8L1k6J4y0B9v2C7x5Z8m3N1p9L0k6J4y2H7n3M8z5W1q9V0x4B7n2M9z6L1k5J4y8R7n3M2z1W9q0V";
const ADMIN_FINAL_KEY = "F1n4l-K3y-9zQ2w8E7r6T5y4U3i2O1p0A9s8D7f6G5h4J3k2L1z0X9c8V7b6N5m4Q3w2E1r0T9y8U7i6O5p4A3s2D1f0G9h8J7k6L5z4";

document.getElementById('role').addEventListener('change', (e) => {
    const adminPanel = document.getElementById('adminSecurity');
    adminPanel.style.display = e.target.value === 'administrator' ? 'block' : 'none';
});

// PART 1: Initial Login Form Submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("--- INITIALIZING LOGIN SEQUENCE ---");

    const role = document.getElementById('role').value;
    // Added .trim() to prevent spacebar errors
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    const supabase = window.createClient(SUPABASE_URL, SUPABASE_KEY);
    const authEmail = username + "@cosmos.sys";

    console.log("1. Attempting Supabase Auth for:", authEmail);

    // Basic Supabase Authentication
    const { data, error } = await supabase.auth.signInWithPassword({ 
        email: authEmail, 
        password: password 
    });

    if (error) {
        console.error("Auth Error:", error.message);
        alert("Access Denied: " + error.message);
        return; // This stops the code completely!
    }

    console.log("2. Supabase Auth Successful!");

    // Multi-Step Administrator Verification
    if (role === 'administrator') {
        console.log("3. Administrator role detected. Checking Security Clearances...");
        
        // Added .trim() to clean the inputs
        const securityAns = document.getElementById('securityAns').value.toLowerCase().trim();
        const inputHash = document.getElementById('hashKey').value.trim();

        // Let's check exactly what the computer sees
        console.log("Passphrase matches?", securityAns === "my temple ere");
        console.log("Hash Key matches?", inputHash === ADMIN_HASH_KEY);

        if (securityAns === "my temple ere" && inputHash === ADMIN_HASH_KEY) {
            console.log("4. Clearance validated! Triggering Modal...");
            document.getElementById('finalKeyModal').style.display = 'flex';
        } else {
            console.error("Clearance Failed. Incorrect Hash or Answer.");
            alert("Security Breach: Incorrect Hash or Answer.");
            await supabase.auth.signOut(); 
        }
    } else {
        console.log("3. Redirecting standard user...");
        window.location.href = role + "-page.html";
    }
});

// PART 2: Final Key Popup Logic
document.getElementById('verifyFinalKeyBtn').addEventListener('click', () => {
    const enteredFinalKey = document.getElementById('finalKeyInput').value.trim();

    if (enteredFinalKey === ADMIN_FINAL_KEY) {
        alert("Final Key Accepted. Clearance Level 2 Granted.");
        window.location.href = "admin-dashboard.html";
    } else {
        alert("CRITICAL ERROR: Invalid Final Key. Access Aborted.");
        document.getElementById('finalKeyModal').style.display = 'none';
        document.getElementById('finalKeyInput').value = '';
    }
});

// Close popup if they hit Abort
document.getElementById('cancelFinalKeyBtn').addEventListener('click', async () => {
    document.getElementById('finalKeyModal').style.display = 'none';
    document.getElementById('finalKeyInput').value = '';
    
    const supabase = window.createClient(SUPABASE_URL, SUPABASE_KEY);
    await supabase.auth.signOut();
    alert("Login sequence aborted.");
});