package com.cinematch.web;

import com.cinematch.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;
  private final AuthSupport authSupport;

  public AuthController(AuthService authService, AuthSupport authSupport) {
    this.authService = authService;
    this.authSupport = authSupport;
  }

  @PostMapping("/register")
  public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body) {
    return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(body));
  }

  @PostMapping("/login")
  public Map<String, Object> login(@RequestBody Map<String, Object> body, HttpServletResponse response) {
    return authService.login(body, response);
  }

  @PostMapping("/logout")
  public Map<String, Object> logout(HttpServletRequest request, HttpServletResponse response) {
    return authService.logout(request, response);
  }

  @GetMapping("/me")
  public Map<String, Object> me(HttpServletRequest request) {
    return authService.me(authSupport.requireLogin(request).getUserId());
  }
}
