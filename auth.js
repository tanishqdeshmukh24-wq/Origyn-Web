const API_BASE = "http://localhost:5000/api";

const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const formMessage = document.querySelector("#form-message");


// =========================
// REGISTER
// =========================

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#register-name").value.trim();
    const email = document.querySelector("#register-email").value.trim();
    const password = document.querySelector("#register-password").value;
    const role = document.querySelector("#register-role").value;

    formMessage.textContent = "Creating your account...";

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password,
                role
            })
        });

        const data = await response.json();

        if (!response.ok) {
            formMessage.textContent = data.error || "Registration failed.";
            return;
        }

        localStorage.setItem("origynAccessToken", data.token);
        localStorage.setItem("origynUser", JSON.stringify(data.user));

        formMessage.textContent = "Account created successfully!";

        console.log("Registered user:", data.user);

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);

    } catch (error) {
        console.error("Registration error:", error);
        formMessage.textContent =
            "Cannot connect to the Origyn backend. Make sure the server is running.";
    }
});


// =========================
// LOGIN
// =========================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#login-email").value.trim();
    const password = document.querySelector("#login-password").value;

    formMessage.textContent = "Logging in...";

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            formMessage.textContent = data.error || "Login failed.";
            return;
        }

        localStorage.setItem("origynAccessToken", data.token);
        localStorage.setItem("origynUser", JSON.stringify(data.user));

        formMessage.textContent = "Login successful!";

        console.log("Logged in user:", data.user);

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);

    } catch (error) {
        console.error("Login error:", error);
        formMessage.textContent =
            "Cannot connect to the Origyn backend. Make sure the server is running.";
    }
});