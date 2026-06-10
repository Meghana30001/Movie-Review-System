package com.cinematch.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class DbService {

  private final JdbcTemplate jdbcTemplate;

  public DbService(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<Map<String, Object>> query(String sql, Object... params) {
    return jdbcTemplate.queryForList(sql, params);
  }

  public Map<String, Object> queryOne(String sql, Object... params) {
    List<Map<String, Object>> rows = query(sql, params);
    return rows.isEmpty() ? null : rows.get(0);
  }

  public int update(String sql, Object... params) {
    return jdbcTemplate.update(sql, params);
  }

  public Number insert(String sql, Object... params) {
    jdbcTemplate.update(sql, params);
    Number key = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Number.class);
    return key == null ? 0 : key;
  }

  public List<Map<String, Object>> callProc(String name, Object... args) {
    String placeholders = String.join(", ", Collections.nCopies(args.length, "?"));
    String sql = "CALL " + name + "(" + placeholders + ")";
    return jdbcTemplate.queryForList(sql, args);
  }
}
