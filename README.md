## README - ACCELERATE ACADEMY

---

- Cyclic Deployment: [ptaacademy.cyclic.app](https://ptaacademy.cyclic.app/)

---

---

### TODOs

- [ ] Add Profile Picture Upload Function

---

---
### Latest Commit - Improved Password validation
```plaintext
    Special characters: ~`! @#$%^&*()_-+={[}]|\:;"'<,>.?/
```
### Forgot Password Reset Added

- [x] Add Password Forgot Function
- Link available on the login page
- Link takes the user to forgot password page
    - Verifies user existence with email and ID
    - generates OTP & sends it if user=true
- Verify OTP Page
    - verifies generated OTP= entered OTP? reset password: recoverOTP
- resetpassword
    - takes the password, validates it, and saves it

---

### Commit - OTP Verification Added

- [x] Add OTP Verification during registration
- **Registration Method:**
    - Email & Password
    - Redirect to the Verification page
    - Enter OTP(Expires in 20 min)
    - Verify Account
    - Any unverified account will be automatically deleted in 20 minutes
    - If a user exits the Verification Page, and comes back to verify after 20 minutes, they will be asked to register again

- **Login Method**
    - Email & password validation
    - If the user is not verified, tell them they are not verified and wait for 10 more minutes to register again

- **Cookies**
    - Cookie age is set to 14 days

---

### Commit - Added Testimonial Form in Dashboard

- Added Settings menu to Dashboard
    - Change name, email, phone feature
    - Moved the Logout Button to the Settings button from the Dashboard
    - Change the password feature
    - Added Dashboard Cards
        - Current Plan Card
        - Payments Card
        - Testimonial Form Card
