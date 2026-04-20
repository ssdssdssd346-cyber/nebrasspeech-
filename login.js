document.addEventListener("DOMContentLoaded", function() {

  var loginForm = document.getElementById("loginForm");
  var messageBox = document.getElementById("messageBox");

  loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value;

    if (username == "" || password == "") {
      messageBox.textContent = "Please fill in all fields";
      messageBox.style.color = "red";
      return;
    }

    try {
      var response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username, password: password })
      });

      var data = await response.json();

      if (response.ok) {
        // حفظ التوكن واسم المستخدم بالطريقة الصحيحة
        localStorage.setItem("nebras_token", data.token);
        localStorage.setItem("nebras_username", data.user.username);
        window.location.href = "/dashboard";
      } else {
        messageBox.textContent = data.error || "Login failed, please try again";
        messageBox.style.color = "red";
      }

    } catch (err) {
      messageBox.textContent = "Network error, please check your connection";
      messageBox.style.color = "red";
    }
  });

});
