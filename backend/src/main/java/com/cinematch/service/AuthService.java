package com.cinematch.service;

import com.cinematch.auth.PasswordHasher;
import com.cinematch.session.SessionStore;
import com.cinematch.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {

  private final DbService db;
  private final PasswordHasher passwordHasher;
  private final SessionStore sessionStore;

  public AuthService(DbService db, PasswordHasher passwordHasher, SessionStore sessionStore) {
    this.db = db;
    this.passwordHasher = passwordHasher;
    this.sessionStore = sessionStore;
  }

  public Map<String, Object> register(Map<String, Object> body) {
    String email = stringVal(body.get("email"));
    String password = stringVal(body.get("password"));
    String name = stringVal(body.get("name"));
    if (email.isBlank() || password.isBlank() || name.isBlank()) {
      throw new ApiException("Name, email and password required", HttpStatus.BAD_REQUEST);
    }
    List<Map<String, Object>> existing = db.query("SELECT user_id FROM Users WHERE email = ?", email);
    if (!existing.isEmpty()) {
      throw new ApiException("Email already registered", HttpStatus.CONFLICT);
    }
    String hashed = passwordHasher.hashPassword(password);
    Number userId = db.insert(
        "INSERT INTO Users (name, email, password_hash, age, gender, location) VALUES (?, ?, ?, ?, ?, ?)",
        name, email, hashed, body.get("age"), body.get("gender"), body.get("location"));
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("message", "Registered successfully");
    result.put("user_id", userId);
    return result;
  }

  public Map<String, Object> login(Map<String, Object> body, HttpServletResponse response) {
    String email = stringVal(body.get("email"));
    String password = stringVal(body.get("password"));
    List<Map<String, Object>> rows = db.query("SELECT * FROM Users WHERE email = ?", email);
    if (rows.isEmpty()) {
      throw new ApiException("Invalid credentials", HttpStatus.UNAUTHORIZED);
    }
    Map<String, Object> user = rows.get(0);
    Object storedHash = user.get("password_hash");
    if (!passwordHasher.verifyPassword(password, storedHash == null ? null : storedHash.toString())) {
      throw new ApiException("Invalid credentials", HttpStatus.UNAUTHORIZED);
    }
    int userId = ((Number) user.get("user_id")).intValue();
    db.update("UPDATE Users SET last_login = NOW() WHERE user_id = ?", userId);
    String role = user.get("role") == null ? "user" : user.get("role").toString();
    sessionStore.setSession(response, userId, user.get("name").toString(), role);

    Map<String, Object> userInfo = new LinkedHashMap<>();
    userInfo.put("user_id", userId);
    userInfo.put("name", user.get("name"));
    userInfo.put("email", user.get("email"));
    userInfo.put("role", role);

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("message", "Login successful");
    result.put("user", userInfo);
    return result;
  }

  public Map<String, Object> logout(HttpServletRequest request, HttpServletResponse response) {
    sessionStore.clearSession(request, response);
    return Map.of("message", "Logged out");
  }

  public Map<String, Object> me(int userId) {
    Map<String, Object> row = db.queryOne(
        "SELECT user_id, name, email, age, gender, location, role, created_at FROM Users WHERE user_id = ?",
        userId);
    return row == null ? Map.of() : row;
  }

  private static String stringVal(Object value) {
    return value == null ? "" : value.toString();
  }
}
