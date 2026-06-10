package com.cinematch.auth;

import org.springframework.stereotype.Component;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class PasswordHasher {

  private static final int ITERATIONS = 600_000;
  private static final int KEY_LENGTH = 256;
  private static final SecureRandom RANDOM = new SecureRandom();

  public String hashPassword(String password) {
    byte[] saltBytes = new byte[16];
    RANDOM.nextBytes(saltBytes);
    String salt = bytesToHex(saltBytes);
    String hash = pbkdf2Hex(password, salt, ITERATIONS);
    return "pbkdf2:sha256:" + ITERATIONS + "$" + salt + "$" + hash;
  }

  public boolean verifyPassword(String password, String stored) {
    if (stored == null || stored.isBlank()) {
      return false;
    }
    if (stored.startsWith("hash_")) {
      String expected = "hash_" + Base64.getEncoder().encodeToString(password.getBytes(StandardCharsets.UTF_8));
      return stored.equals(expected);
    }
    if (!stored.startsWith("pbkdf2:sha256:")) {
      return false;
    }
    String[] parts = stored.split("\\$");
    if (parts.length != 3) {
      return false;
    }
    String[] header = parts[0].split(":");
    if (header.length < 3) {
      return false;
    }
    int iterations = Integer.parseInt(header[2]);
    String salt = parts[1];
    String expected = parts[2];
    String hash = pbkdf2Hex(password, salt, iterations);
    return hash.equals(expected);
  }

  private String pbkdf2Hex(String password, String saltHex, int iterations) {
    try {
      byte[] salt = hexToBytes(saltHex);
      PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, KEY_LENGTH);
      SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
      byte[] hash = factory.generateSecret(spec).getEncoded();
      return bytesToHex(hash);
    } catch (Exception e) {
      throw new IllegalStateException("PBKDF2 failed", e);
    }
  }

  private static String bytesToHex(byte[] bytes) {
    StringBuilder sb = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) {
      sb.append(String.format("%02x", b));
    }
    return sb.toString();
  }

  private static byte[] hexToBytes(String hex) {
    byte[] bytes = new byte[hex.length() / 2];
    for (int i = 0; i < bytes.length; i++) {
      bytes[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}
