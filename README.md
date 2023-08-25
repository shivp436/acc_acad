﻿## README - ACCELERATE ACADEMY

---
#### Cyclic Deployment: [ptaacademy.cyclic.app](https://ptaacademy.cyclic.app/)
---

---
#### TODOs
    [] Add Password Forgot Function
    [] Add Profile Picture Upload Function
---

---
### Latest Commit - OTP Verification Added
    - **Registration Method:**
        - Email & Password
        - Redirect to Verification page
        - Enter OTP(Expires in 20 min)
        - Verify Account
        - Any unverified account will be automatically deleted in 20 minutes
        - If an user exits the Verification Page, and comes back to verify after 20 minutes, they will be asked to register again

    - **Login Method**
        - Email & password validation
        - If user not verified, tell them they are not verified and wait for 10 more minutes to register again

    - **Cookies**
        - Cookie age is set to 14 days
---
### Commit - Added Testimonial Form in Dashboard
    - Added Settings menu to Dashboard
        - Change name, email, phone feature
        - Moved Logout Button to Settings button from Dashboard
        - Change password feature
        - Added Dashboard Cards
            - Current Plan Card
            - Payments Card
            - Testimonial Form Card
