"""
Movie Recommendation System — Flask Backend
Run: pip install flask flask-cors mysql-connector-python werkzeug
python app.py
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import functools

app = Flask(__name__)
app.secret_key = "movie_rec_secret_2024"
CORS(app, supports_credentials=True)

# ─── DB CONFIG ───────────────────────────────────────────────
DB_CONFIG = {
    "host":     "localhost",
    "user":     "root",
    "password": "your_mysql_password",   # ← change this
    "database": "movie_rec_db"
}

def get_db():
    """Return a new DB connection."""
    return mysql.connector.connect(**DB_CONFIG)

def query(sql, params=(), fetchone=False, commit=False):
    """Execute SQL and return results."""
    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        if commit:
            conn.commit()
            return cur.lastrowid
        return cur.fetchone() if fetchone else cur.fetchall()
    except Error as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()

def call_proc(name, args=()):
    """Call a stored procedure and return all rows."""
    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.callproc(name, args)
        rows = []
        for result in cur.stored_results():
            rows.extend(result.fetchall())
        return rows
    finally:
        cur.close()
        conn.close()

# ─── AUTH HELPERS ────────────────────────────────────────────

def login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if session.get("role") != "admin":
            return jsonify({"error": "Forbidden"}), 403
        return f(*args, **kwargs)
    return login_required(decorated)

# ─── AUTH ROUTES ─────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    d = request.json
    if not d.get("email") or not d.get("password") or not d.get("name"):
        return jsonify({"error": "Name, email and password required"}), 400
    existing = query("SELECT user_id FROM Users WHERE email=%s", (d["email"],), fetchone=True)
    if existing:
        return jsonify({"error": "Email already registered"}), 409
    hashed = generate_password_hash(d["password"])
    uid = query(
        "INSERT INTO Users (name,email,password_hash,age,gender,location) VALUES (%s,%s,%s,%s,%s,%s)",
        (d["name"], d["email"], hashed, d.get("age"), d.get("gender"), d.get("location")),
        commit=True
    )
    return jsonify({"message": "Registered successfully", "user_id": uid}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    d = request.json
    user = query("SELECT * FROM Users WHERE email=%s", (d.get("email",""),), fetchone=True)
    if not user or not check_password_hash(user["password_hash"], d.get("password","")):
        return jsonify({"error": "Invalid credentials"}), 401
    query("UPDATE Users SET last_login=NOW() WHERE user_id=%s", (user["user_id"],), commit=True)
    session.update({"user_id": user["user_id"], "role": user["role"], "name": user["name"]})
    return jsonify({"message": "Login successful", "user": {
        "user_id": user["user_id"], "name": user["name"],
        "email": user["email"],    "role": user["role"]
    }})

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    user = query("SELECT user_id,name,email,age,gender,location,role,created_at FROM Users WHERE user_id=%s",
                 (session["user_id"],), fetchone=True)
    return jsonify(user)

# ─── MOVIE ROUTES ────────────────────────────────────────────

@app.route("/api/movies", methods=["GET"])
def get_movies():
    page     = int(request.args.get("page", 1))
    limit    = min(int(request.args.get("limit", 20)), 50)
    offset   = (page - 1) * limit
    sort     = request.args.get("sort", "avg_rating")
    order    = "DESC" if request.args.get("order", "desc") == "desc" else "ASC"
    genre    = request.args.get("genre")
    language = request.args.get("language")
    year     = request.args.get("year")
    search   = request.args.get("q")

    sql  = "SELECT DISTINCT m.* FROM Movies m "
    params = []

    if genre:
        sql += "JOIN Movie_Genres mg ON m.movie_id=mg.movie_id JOIN Genres g ON mg.genre_id=g.genre_id "
    if search:
        sql += "WHERE MATCH(m.title,m.synopsis) AGAINST(%s IN BOOLEAN MODE) "
        params.append(search + "*")
    else:
        conditions = []
        if genre:    conditions.append("g.genre_name = %s"); params.append(genre)
        if language: conditions.append("m.language = %s"); params.append(language)
        if year:     conditions.append("m.release_year = %s"); params.append(year)
        if conditions: sql += "WHERE " + " AND ".join(conditions) + " "

    allowed_sorts = {"avg_rating","total_ratings","release_year","title"}
    sort = sort if sort in allowed_sorts else "avg_rating"
    sql += f"ORDER BY m.{sort} {order} LIMIT %s OFFSET %s"
    params += [limit, offset]

    movies = query(sql, tuple(params))
    # Attach genres
    for m in movies:
        m["genres"] = [r["genre_name"] for r in query(
            "SELECT g.genre_name FROM Movie_Genres mg JOIN Genres g ON mg.genre_id=g.genre_id WHERE mg.movie_id=%s",
            (m["movie_id"],)
        )]
    return jsonify({"movies": movies, "page": page, "limit": limit})

@app.route("/api/movies/<int:movie_id>", methods=["GET"])
def get_movie(movie_id):
    movie = query("SELECT * FROM vw_movie_full WHERE movie_id=%s", (movie_id,), fetchone=True)
    if not movie:
        return jsonify({"error": "Movie not found"}), 404
    movie["awards"] = query("SELECT * FROM Awards WHERE movie_id=%s", (movie_id,))
    movie["reviews"] = query(
        "SELECT r.rating_id,r.score,r.review_text,r.created_at,u.name AS reviewer "
        "FROM Ratings r JOIN Users u ON r.user_id=u.user_id "
        "WHERE r.movie_id=%s ORDER BY r.created_at DESC LIMIT 20", (movie_id,)
    )
    return jsonify(movie)

@app.route("/api/movies/trending", methods=["GET"])
def get_trending():
    return jsonify(query("SELECT * FROM vw_trending_movies LIMIT 10"))

@app.route("/api/movies/top-rated", methods=["GET"])
def get_top_rated():
    return jsonify(query("SELECT * FROM vw_top_rated_movies LIMIT 20"))

@app.route("/api/movies/<int:movie_id>/similar", methods=["GET"])
def get_similar(movie_id):
    rows = call_proc("get_because_you_watched", (movie_id, 8))
    return jsonify(rows)

# Admin: add movie
@app.route("/api/movies", methods=["POST"])
@admin_required
def add_movie():
    d = request.json
    mid = query(
        "INSERT INTO Movies (title,release_year,duration,language,synopsis,poster_url,trailer_url,is_adult) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        (d["title"],d.get("release_year"),d.get("duration"),d.get("language","English"),
         d.get("synopsis"),d.get("poster_url"),d.get("trailer_url"),d.get("is_adult",False)),
        commit=True
    )
    for gid in d.get("genre_ids", []):
        query("INSERT IGNORE INTO Movie_Genres VALUES (%s,%s)", (mid, gid), commit=True)
    return jsonify({"message": "Movie added", "movie_id": mid}), 201

@app.route("/api/movies/<int:movie_id>", methods=["DELETE"])
@admin_required
def delete_movie(movie_id):
    query("DELETE FROM Movies WHERE movie_id=%s", (movie_id,), commit=True)
    return jsonify({"message": "Movie deleted"})

# ─── RATINGS ROUTES ──────────────────────────────────────────

@app.route("/api/ratings", methods=["POST"])
@login_required
def submit_rating():
    d = request.json
    if not (1 <= d.get("score", 0) <= 5):
        return jsonify({"error": "Score must be 1–5"}), 400
    existing = query("SELECT rating_id FROM Ratings WHERE user_id=%s AND movie_id=%s",
                     (session["user_id"], d["movie_id"]), fetchone=True)
    if existing:
        query("UPDATE Ratings SET score=%s, review_text=%s WHERE rating_id=%s",
              (d["score"], d.get("review_text"), existing["rating_id"]), commit=True)
        return jsonify({"message": "Rating updated"})
    query("INSERT INTO Ratings (user_id,movie_id,score,review_text) VALUES (%s,%s,%s,%s)",
          (session["user_id"], d["movie_id"], d["score"], d.get("review_text")), commit=True)
    return jsonify({"message": "Rating submitted"}), 201

@app.route("/api/ratings/<int:rating_id>", methods=["DELETE"])
@login_required
def delete_rating(rating_id):
    r = query("SELECT * FROM Ratings WHERE rating_id=%s AND user_id=%s",
              (rating_id, session["user_id"]), fetchone=True)
    if not r:
        return jsonify({"error": "Not found"}), 404
    query("DELETE FROM Ratings WHERE rating_id=%s", (rating_id,), commit=True)
    return jsonify({"message": "Review deleted"})

# ─── WATCHLIST ROUTES ────────────────────────────────────────

@app.route("/api/watchlist", methods=["GET"])
@login_required
def get_watchlist():
    rows = query(
        "SELECT m.movie_id,m.title,m.release_year,m.avg_rating,m.poster_url,w.added_on "
        "FROM Watchlist w JOIN Movies m ON w.movie_id=m.movie_id "
        "WHERE w.user_id=%s ORDER BY w.added_on DESC", (session["user_id"],)
    )
    return jsonify(rows)

@app.route("/api/watchlist/<int:movie_id>", methods=["POST"])
@login_required
def add_to_watchlist(movie_id):
    query("INSERT IGNORE INTO Watchlist (user_id,movie_id) VALUES (%s,%s)",
          (session["user_id"], movie_id), commit=True)
    return jsonify({"message": "Added to watchlist"}), 201

@app.route("/api/watchlist/<int:movie_id>", methods=["DELETE"])
@login_required
def remove_from_watchlist(movie_id):
    query("DELETE FROM Watchlist WHERE user_id=%s AND movie_id=%s",
          (session["user_id"], movie_id), commit=True)
    return jsonify({"message": "Removed from watchlist"})

@app.route("/api/watch-history", methods=["GET"])
@login_required
def get_history():
    rows = query(
        "SELECT m.movie_id,m.title,m.release_year,m.avg_rating,m.poster_url,wh.watched_on,wh.completion_pct "
        "FROM Watch_History wh JOIN Movies m ON wh.movie_id=m.movie_id "
        "WHERE wh.user_id=%s ORDER BY wh.watched_on DESC", (session["user_id"],)
    )
    return jsonify(rows)

@app.route("/api/watch-history/<int:movie_id>", methods=["POST"])
@login_required
def mark_watched(movie_id):
    pct = request.json.get("completion_pct", 100)
    query("INSERT INTO Watch_History (user_id,movie_id,completion_pct) VALUES (%s,%s,%s) "
          "ON DUPLICATE KEY UPDATE watched_on=NOW(), completion_pct=%s",
          (session["user_id"], movie_id, pct, pct), commit=True)
    # Remove from watchlist
    query("DELETE FROM Watchlist WHERE user_id=%s AND movie_id=%s",
          (session["user_id"], movie_id), commit=True)
    return jsonify({"message": "Marked as watched"})

# ─── RECOMMENDATIONS ─────────────────────────────────────────

@app.route("/api/recommendations/content", methods=["GET"])
@login_required
def rec_content():
    rows = call_proc("get_content_based_recommendations", (session["user_id"], 10))
    return jsonify(rows)

@app.route("/api/recommendations/collaborative", methods=["GET"])
@login_required
def rec_collab():
    rows = call_proc("get_collaborative_recommendations", (session["user_id"], 10))
    return jsonify(rows)

@app.route("/api/recommendations/popular", methods=["GET"])
def rec_popular():
    rows = query("SELECT * FROM vw_top_rated_movies LIMIT 10")
    return jsonify(rows)

@app.route("/api/recommendations/trending", methods=["GET"])
def rec_trending():
    rows = query("SELECT * FROM vw_trending_movies LIMIT 10")
    return jsonify(rows)

# ─── GENRES ──────────────────────────────────────────────────

@app.route("/api/genres", methods=["GET"])
def get_genres():
    return jsonify(query("SELECT * FROM Genres ORDER BY genre_name"))

@app.route("/api/genres/popularity", methods=["GET"])
def genre_popularity():
    return jsonify(query("SELECT * FROM vw_genre_popularity"))

# ─── ADMIN ROUTES ────────────────────────────────────────────

@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def admin_stats():
    rows = call_proc("get_platform_stats")
    return jsonify(rows[0] if rows else {})

@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_users():
    users = query(
        "SELECT user_id,name,email,role,age,location,created_at,last_login FROM Users ORDER BY created_at DESC"
    )
    return jsonify(users)

@app.route("/api/admin/inactive-users", methods=["GET"])
@admin_required
def inactive_users():
    rows = query(
        "SELECT user_id,name,email,last_login FROM Users "
        "WHERE last_login < DATE_SUB(NOW(), INTERVAL 30 DAY) OR last_login IS NULL"
    )
    return jsonify(rows)

@app.route("/api/admin/top-movies", methods=["GET"])
@admin_required
def top_movies_by_genre():
    genre = request.args.get("genre")
    if genre:
        sql = (
            "SELECT m.movie_id,m.title,m.avg_rating,m.total_ratings "
            "FROM Movies m "
            "JOIN Movie_Genres mg ON m.movie_id=mg.movie_id "
            "JOIN Genres g ON mg.genre_id=g.genre_id "
            "WHERE g.genre_name=%s ORDER BY m.avg_rating DESC LIMIT 10"
        )
        return jsonify(query(sql, (genre,)))
    return jsonify(query("SELECT * FROM vw_top_rated_movies LIMIT 10"))

@app.route("/api/admin/reviews", methods=["GET"])
@admin_required
def admin_reviews():
    return jsonify(query(
        "SELECT r.rating_id,r.score,r.review_text,r.created_at,"
        "u.name AS reviewer,m.title AS movie "
        "FROM Ratings r JOIN Users u ON r.user_id=u.user_id "
        "JOIN Movies m ON r.movie_id=m.movie_id ORDER BY r.created_at DESC LIMIT 50"
    ))

@app.route("/api/admin/reviews/<int:rating_id>", methods=["DELETE"])
@admin_required
def admin_delete_review(rating_id):
    query("DELETE FROM Ratings WHERE rating_id=%s", (rating_id,), commit=True)
    return jsonify({"message": "Review removed"})

# ─── USER PREFERENCES ────────────────────────────────────────

@app.route("/api/user/preferences", methods=["GET", "POST"])
@login_required
def preferences():
    uid = session["user_id"]
    if request.method == "POST":
        d = request.json
        query("INSERT INTO User_Preferences (user_id,fav_genres,fav_languages) VALUES (%s,%s,%s) "
              "ON DUPLICATE KEY UPDATE fav_genres=%s, fav_languages=%s",
              (uid, d.get("fav_genres"), d.get("fav_languages"),
               d.get("fav_genres"), d.get("fav_languages")), commit=True)
        return jsonify({"message": "Preferences saved"})
    row = query("SELECT * FROM User_Preferences WHERE user_id=%s", (uid,), fetchone=True)
    return jsonify(row or {})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
