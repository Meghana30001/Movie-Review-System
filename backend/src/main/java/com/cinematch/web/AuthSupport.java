package com.cinematch.web;

import com.cinematch.session.SessionInfo;
import com.cinematch.session.SessionStore;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AuthSupport {

  private final SessionStore sessionStore;

  public AuthSupport(SessionStore sessionStore) {
    this.sessionStore = sessionStore;
  }

  public SessionInfo requireLogin(HttpServletRequest request) {
    SessionInfo session = sessionStore.getSession(request);
    if (session == null) {
      throw new ApiException("Unauthorized", HttpStatus.UNAUTHORIZED);
    }
    return session;
  }

  public SessionInfo requireAdmin(HttpServletRequest request) {
    SessionInfo session = requireLogin(request);
    if (!"admin".equals(session.getRole())) {
      throw new ApiException("Forbidden", HttpStatus.FORBIDDEN);
    }
    return session;
  }
}
