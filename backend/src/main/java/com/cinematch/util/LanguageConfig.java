package com.cinematch.util;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class LanguageConfig {

  public static final List<String> INDIAN_LANGUAGES = List.of(
      "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "Bengali", "Marathi",
      "Punjabi", "Gujarati", "Assamese", "Odia",
      "hi", "ta", "te", "ml", "kn", "bn", "mr", "pa", "gu", "as", "or");

  public static final List<LanguageGroup> INDIAN_LANGUAGE_GROUPS = List.of(
      new LanguageGroup("hi", List.of("Hindi", "hi")),
      new LanguageGroup("ta", List.of("Tamil", "ta")),
      new LanguageGroup("te", List.of("Telugu", "te")),
      new LanguageGroup("ml", List.of("Malayalam", "ml")),
      new LanguageGroup("kn", List.of("Kannada", "kn")),
      new LanguageGroup("bn", List.of("Bengali", "bn")),
      new LanguageGroup("mr", List.of("Marathi", "mr")),
      new LanguageGroup("pa", List.of("Punjabi", "pa")),
      new LanguageGroup("gu", List.of("Gujarati", "gu")),
      new LanguageGroup("as", List.of("Assamese", "as")),
      new LanguageGroup("or", List.of("Odia", "or")));

  public static final List<LanguageGroup> INTERNATIONAL_LANGUAGE_GROUPS = List.of(
      new LanguageGroup("zh", List.of("zh")),
      new LanguageGroup("en", List.of("en", "English")),
      new LanguageGroup("fr", List.of("fr")),
      new LanguageGroup("de", List.of("de")),
      new LanguageGroup("it", List.of("it")),
      new LanguageGroup("ja", List.of("ja")),
      new LanguageGroup("ko", List.of("ko", "Korean")),
      new LanguageGroup("no", List.of("no")),
      new LanguageGroup("pt", List.of("pt")),
      new LanguageGroup("ru", List.of("ru")),
      new LanguageGroup("es", List.of("es")),
      new LanguageGroup("sv", List.of("sv")),
      new LanguageGroup("th", List.of("th")),
      new LanguageGroup("tr", List.of("tr")));

  public List<String> resolveLanguageCodes(String language) {
    if (language == null || language.isBlank()) {
      return List.of();
    }
    String lang = language.trim();
    for (LanguageGroup group : allGroups()) {
      if (group.browse().equals(lang)
          || group.codes().stream().anyMatch(code -> code.equalsIgnoreCase(lang))) {
        return group.codes();
      }
    }
    return List.of(lang);
  }

  public List<LanguageGroup> allGroups() {
    List<LanguageGroup> groups = new ArrayList<>(INDIAN_LANGUAGE_GROUPS);
    groups.addAll(INTERNATIONAL_LANGUAGE_GROUPS);
    return groups;
  }

  public record LanguageGroup(String browse, List<String> codes) {}
}
