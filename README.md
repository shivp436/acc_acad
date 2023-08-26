## README - ACCELERATE ACADEMY

---

    - Cyclic Deployment: [ptaacademy.cyclic.app](https://ptaacademy.cyclic.app/)

---

---

### TODOs

    [] Add Profile Picture Upload Function

---

---

### Latest Commit - Forgot Password Reset Added

    > [x] Add Password Forgot Function
    - Link available on login page
    - Link takes user to forgotpassword page
        - verifies user existence with email & id
        - generates OTP & sends it if user=true
    - Verify OTP Page
        - verifies generated OTP= entered OTP? resetpassword : recoverOTP
    - resetpassword
        - takes password, validates it and saves it

---

### Commit - OTP Verification Added

    > [x] Add OTP Verification during registraion
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
