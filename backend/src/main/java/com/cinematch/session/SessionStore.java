package com.cinematch.session;

import com.cinematch.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SessionStore {

  private static final String COOKIE_NAME = "session";
  private static final SecureRandom RANDOM = new SecureRandom();

  private final Map<String, SessionInfo> sessions = new ConcurrentHashMap<>();
  private final AppProperties appProperties;

  public SessionStore(AppProperties appProperties) {
    this.appProperties = appProperties;
  }

  public SessionInfo getSession(HttpServletRequest request) {
    String sid = readCookie(request, COOKIE_NAME);
    if (sid == null || sid.isBlank()) {
      return null;
    }
    return sessions.get(sid);
  }

  public void setSession(HttpServletResponse response, int userId, String name, String role) {
    byte[] bytes = new byte[24];
    RANDOM.nextBytes(bytes);
    StringBuilder sb = new StringBuilder(48);
    for (byte b : bytes) {
      sb.append(String.format("%02x", b));
    }
    String sid = sb.toString();
    sessions.put(sid, new SessionInfo(userId, name, role));
    response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(sid, -1).toString());
  }

  public void clearSession(HttpServletRequest request, HttpServletResponse response) {
    String sid = readCookie(request, COOKIE_NAME);
    if (sid != null) {
      sessions.remove(sid);
    }
    response.addHeader(HttpHeaders.SET_COOKIE, buildCookie("", 0).toString());
  }

  private ResponseCookie buildCookie(String value, int maxAge) {
    ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(COOKIE_NAME, value)
        .path("/")
        .httpOnly(true);
    if (appProperties.useSecureSessionCookies()) {
      builder.sameSite("None").secure(true);
    } else {
      builder.sameSite("Lax");
    }
    if (maxAge >= 0) {
      builder.maxAge(maxAge);
    }
    return builder.build();
  }

  private static String readCookie(HttpServletRequest request, String name) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
      return null;
    }
    for (Cookie cookie : cookies) {
      if (name.equals(cookie.getName())) {
        return cookie.getValue();
      }
    }
    return null;
  }
}
