package com.cinematch.session;

public class SessionInfo {

  private final int userId;
  private final String name;
  private final String role;

  public SessionInfo(int userId, String name, String role) {
    this.userId = userId;
    this.name = name;
    this.role = role;
  }

  public int getUserId() {
    return userId;
  }

  public String getName() {
    return name;
  }

  public String getRole() {
    return role;
  }
}
