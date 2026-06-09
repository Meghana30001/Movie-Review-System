-- ============================================================
--  MOVIE RECOMMENDATION SYSTEM — DBMS Mini Project
--  Database: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS movie_rec_db;
USE movie_rec_db;

-- ─── CORE TABLES ────────────────────────────────────────────

CREATE TABLE Users (
    user_id      INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    age          TINYINT UNSIGNED,
    gender       ENUM('Male','Female','Other'),
    location     VARCHAR(100),
    role         ENUM('user','admin') DEFAULT 'user',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login   DATETIME
);

CREATE TABLE User_Preferences (
    user_id      INT PRIMARY KEY,
    fav_genres   VARCHAR(255),   -- comma-separated genre names
    fav_languages VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Genres (
    genre_id     INT AUTO_INCREMENT PRIMARY KEY,
    genre_name   VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE People (
    person_id    INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    dob          DATE,
    nationality  VARCHAR(80)
);

CREATE TABLE Movies (
    movie_id     INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    release_year YEAR,
    duration     SMALLINT UNSIGNED COMMENT 'minutes',
    language     VARCHAR(50),
    synopsis     TEXT,
    poster_url   VARCHAR(512),
    trailer_url  VARCHAR(512),
    avg_rating   DECIMAL(3,2) DEFAULT 0.00,
    total_ratings INT DEFAULT 0,
    is_adult     BOOLEAN DEFAULT FALSE,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Movie_Genres (
    movie_id  INT,
    genre_id  INT,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES Genres(genre_id) ON DELETE CASCADE
);

CREATE TABLE Movie_Cast (
    movie_id  INT,
    person_id INT,
    role_type ENUM('Director','Actor','Writer','Producer'),
    character_name VARCHAR(100),
    PRIMARY KEY (movie_id, person_id, role_type),
    FOREIGN KEY (movie_id)  REFERENCES Movies(movie_id)  ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES People(person_id) ON DELETE CASCADE
);

CREATE TABLE Ratings (
    rating_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    movie_id    INT NOT NULL,
    score       TINYINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    review_text TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_movie (user_id, movie_id),
    FOREIGN KEY (user_id)  REFERENCES Users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE Watchlist (
    user_id   INT,
    movie_id  INT,
    added_on  DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, movie_id),
    FOREIGN KEY (user_id)  REFERENCES Users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE Watch_History (
    user_id        INT,
    movie_id       INT,
    watched_on     DATETIME DEFAULT CURRENT_TIMESTAMP,
    completion_pct TINYINT DEFAULT 100,
    PRIMARY KEY (user_id, movie_id),
    FOREIGN KEY (user_id)  REFERENCES Users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE Tags (
    tag_id   INT AUTO_INCREMENT PRIMARY KEY,
    tag_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Movie_Tags (
    movie_id INT,
    tag_id   INT,
    user_id  INT,
    PRIMARY KEY (movie_id, tag_id, user_id),
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)   REFERENCES Tags(tag_id)     ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES Users(user_id)   ON DELETE CASCADE
);

CREATE TABLE Awards (
    award_id    INT AUTO_INCREMENT PRIMARY KEY,
    movie_id    INT NOT NULL,
    award_name  VARCHAR(150),
    category    VARCHAR(100),
    year_won    YEAR,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
);

CREATE TABLE Notifications (
    notif_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    message    VARCHAR(255),
    is_read    BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ─── INDEXES ────────────────────────────────────────────────

CREATE INDEX idx_movies_title      ON Movies(title);
CREATE INDEX idx_movies_year       ON Movies(release_year);
CREATE INDEX idx_movies_language   ON Movies(language);
CREATE INDEX idx_ratings_user      ON Ratings(user_id);
CREATE INDEX idx_ratings_movie     ON Ratings(movie_id);
CREATE INDEX idx_watch_hist_user   ON Watch_History(user_id);
CREATE FULLTEXT INDEX ft_movies    ON Movies(title, synopsis);

-- ─── VIEWS ──────────────────────────────────────────────────

CREATE VIEW vw_top_rated_movies AS
SELECT m.movie_id, m.title, m.release_year, m.language,
       m.avg_rating, m.total_ratings, m.poster_url,
       GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ') AS genres
FROM Movies m
JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
JOIN Genres g        ON mg.genre_id = g.genre_id
GROUP BY m.movie_id
ORDER BY m.avg_rating DESC, m.total_ratings DESC;

CREATE VIEW vw_trending_movies AS
SELECT m.movie_id, m.title, m.release_year, m.avg_rating,
       m.total_ratings, m.poster_url,
       COUNT(r.rating_id) AS recent_ratings
FROM Movies m
JOIN Ratings r ON m.movie_id = r.movie_id
WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY m.movie_id
ORDER BY recent_ratings DESC, m.avg_rating DESC;

CREATE VIEW vw_genre_popularity AS
SELECT g.genre_name,
       COUNT(DISTINCT mg.movie_id) AS movie_count,
       ROUND(AVG(m.avg_rating), 2)  AS avg_genre_rating,
       SUM(m.total_ratings)         AS total_votes
FROM Genres g
JOIN Movie_Genres mg ON g.genre_id = mg.genre_id
JOIN Movies m        ON mg.movie_id = m.movie_id
GROUP BY g.genre_name
ORDER BY total_votes DESC;

CREATE VIEW vw_movie_full AS
SELECT
    m.*,
    GROUP_CONCAT(DISTINCT g.genre_name  ORDER BY g.genre_name  SEPARATOR ', ') AS genres,
    GROUP_CONCAT(DISTINCT CASE WHEN mc.role_type='Director' THEN p.name END SEPARATOR ', ') AS directors,
    GROUP_CONCAT(DISTINCT CASE WHEN mc.role_type='Actor'    THEN p.name END SEPARATOR ', ') AS cast_members
FROM Movies m
LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
LEFT JOIN Genres g        ON mg.genre_id = g.genre_id
LEFT JOIN Movie_Cast mc   ON m.movie_id = mc.movie_id
LEFT JOIN People p        ON mc.person_id = p.person_id
GROUP BY m.movie_id;

-- ─── TRIGGERS ───────────────────────────────────────────────

DELIMITER //

CREATE TRIGGER trg_update_avg_rating_insert
AFTER INSERT ON Ratings
FOR EACH ROW
BEGIN
    UPDATE Movies
    SET avg_rating   = (SELECT ROUND(AVG(score), 2) FROM Ratings WHERE movie_id = NEW.movie_id),
        total_ratings = (SELECT COUNT(*) FROM Ratings WHERE movie_id = NEW.movie_id)
    WHERE movie_id = NEW.movie_id;
END //

CREATE TRIGGER trg_update_avg_rating_update
AFTER UPDATE ON Ratings
FOR EACH ROW
BEGIN
    UPDATE Movies
    SET avg_rating = (SELECT ROUND(AVG(score), 2) FROM Ratings WHERE movie_id = NEW.movie_id)
    WHERE movie_id = NEW.movie_id;
END //

CREATE TRIGGER trg_update_avg_rating_delete
AFTER DELETE ON Ratings
FOR EACH ROW
BEGIN
    UPDATE Movies
    SET avg_rating   = COALESCE((SELECT ROUND(AVG(score),2) FROM Ratings WHERE movie_id = OLD.movie_id), 0),
        total_ratings = (SELECT COUNT(*) FROM Ratings WHERE movie_id = OLD.movie_id)
    WHERE movie_id = OLD.movie_id;
END //

CREATE TRIGGER trg_last_login
BEFORE UPDATE ON Users
FOR EACH ROW
BEGIN
    IF NEW.last_login IS NOT NULL AND NEW.last_login != OLD.last_login THEN
        SET NEW.last_login = NOW();
    END IF;
END //

DELIMITER ;

-- ─── STORED PROCEDURES ──────────────────────────────────────

DELIMITER //

-- 1. Content-based recommendations
CREATE PROCEDURE get_content_based_recommendations(IN p_user_id INT, IN p_limit INT)
BEGIN
    -- Recommend movies sharing genres with the top-rated movies of the user
    SELECT DISTINCT m.movie_id, m.title, m.release_year, m.avg_rating,
                    m.total_ratings, m.poster_url,
                    GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres,
                    'content-based' AS rec_type
    FROM Movies m
    JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
    JOIN Genres g        ON mg.genre_id = g.genre_id
    WHERE mg.genre_id IN (
        SELECT DISTINCT mg2.genre_id
        FROM Ratings r2
        JOIN Movie_Genres mg2 ON r2.movie_id = mg2.movie_id
        WHERE r2.user_id = p_user_id AND r2.score >= 4
    )
    AND m.movie_id NOT IN (SELECT movie_id FROM Ratings WHERE user_id = p_user_id)
    AND m.movie_id NOT IN (SELECT movie_id FROM Watch_History WHERE user_id = p_user_id)
    GROUP BY m.movie_id
    ORDER BY m.avg_rating DESC, m.total_ratings DESC
    LIMIT p_limit;
END //

-- 2. Collaborative filtering
CREATE PROCEDURE get_collaborative_recommendations(IN p_user_id INT, IN p_limit INT)
BEGIN
    -- Find users with similar taste; recommend their highly-rated, unwatched movies
    WITH similar_users AS (
        SELECT r2.user_id,
               COUNT(*) AS shared_movies,
               AVG(ABS(r1.score - r2.score)) AS avg_diff
        FROM Ratings r1
        JOIN Ratings r2 ON r1.movie_id = r2.movie_id
                        AND r2.user_id != p_user_id
        WHERE r1.user_id = p_user_id
        GROUP BY r2.user_id
        HAVING shared_movies >= 2 AND avg_diff < 1.5
        ORDER BY shared_movies DESC, avg_diff ASC
        LIMIT 10
    )
    SELECT DISTINCT m.movie_id, m.title, m.release_year, m.avg_rating,
                    m.total_ratings, m.poster_url,
                    GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres,
                    'collaborative' AS rec_type
    FROM Ratings r
    JOIN similar_users su ON r.user_id = su.user_id
    JOIN Movies m         ON r.movie_id = m.movie_id
    JOIN Movie_Genres mg  ON m.movie_id = mg.movie_id
    JOIN Genres g         ON mg.genre_id = g.genre_id
    WHERE r.score >= 4
      AND m.movie_id NOT IN (SELECT movie_id FROM Ratings     WHERE user_id = p_user_id)
      AND m.movie_id NOT IN (SELECT movie_id FROM Watch_History WHERE user_id = p_user_id)
    GROUP BY m.movie_id
    ORDER BY m.avg_rating DESC
    LIMIT p_limit;
END //

-- 3. "Because you watched X"
CREATE PROCEDURE get_because_you_watched(IN p_movie_id INT, IN p_limit INT)
BEGIN
    SELECT DISTINCT m.movie_id, m.title, m.release_year, m.avg_rating,
                    m.total_ratings, m.poster_url,
                    GROUP_CONCAT(DISTINCT g.genre_name SEPARATOR ', ') AS genres
    FROM Movies m
    JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
    WHERE mg.genre_id IN (
            SELECT genre_id FROM Movie_Genres WHERE movie_id = p_movie_id
          )
      AND m.movie_id != p_movie_id
    GROUP BY m.movie_id
    ORDER BY m.avg_rating DESC
    LIMIT p_limit;
END //

-- 4. Platform statistics (admin)
CREATE PROCEDURE get_platform_stats()
BEGIN
    SELECT
        (SELECT COUNT(*) FROM Users WHERE role='user')       AS total_users,
        (SELECT COUNT(*) FROM Movies)                         AS total_movies,
        (SELECT COUNT(*) FROM Ratings)                        AS total_ratings,
        (SELECT COUNT(*) FROM Watch_History)                  AS total_watches,
        (SELECT ROUND(AVG(avg_rating),2) FROM Movies WHERE total_ratings > 0) AS platform_avg_rating,
        (SELECT COUNT(*) FROM Users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS active_7d;
END //

DELIMITER ;

-- ─── SEED DATA ───────────────────────────────────────────────

INSERT INTO Genres (genre_name) VALUES
('Action'),('Adventure'),('Animation'),('Comedy'),('Crime'),
('Documentary'),('Drama'),('Fantasy'),('Horror'),('Mystery'),
('Romance'),('Sci-Fi'),('Thriller'),('Western'),('Biography');

INSERT INTO People (name, nationality) VALUES
('Christopher Nolan','British'),('Steven Spielberg','American'),
('Quentin Tarantino','American'),('Greta Gerwig','American'),
('SS Rajamouli','Indian'),('Leonardo DiCaprio','American'),
('Margot Robbie','Australian'),('Tom Hanks','American'),
('Priyanka Chopra','Indian'),('Cillian Murphy','Irish');

INSERT INTO Movies (title, release_year, duration, language, synopsis, avg_rating, total_ratings, poster_url) VALUES
('Inception', 2010, 148, 'English', 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.', 4.7, 2841, 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg'),
('The Dark Knight', 2008, 152, 'English', 'Batman faces the Joker, a criminal mastermind who wants to plunge Gotham City into anarchy.', 4.8, 3200, 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg'),
('RRR', 2022, 187, 'Telugu', 'A fictional story about two legendary revolutionaries and their journey far away from home.', 4.5, 1500, 'https://image.tmdb.org/t/p/w500/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg'),
('Interstellar', 2014, 169, 'English', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.', 4.6, 2500, 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'),
('Barbie', 2023, 114, 'English', 'Barbie and Ken go on a journey of self-discovery after leaving Barbieland.', 4.1, 1900, 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg'),
('Oppenheimer', 2023, 180, 'English', 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.', 4.7, 2200, 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg'),
('3 Idiots', 2009, 170, 'Hindi', 'Two friends search for their long-lost companion while reminiscing about their college days.', 4.6, 2000, 'https://image.tmdb.org/t/p/w500/66A9MqXOyVFCssoloscw79z8Tew.jpg'),
('Parasite', 2019, 132, 'Korean', 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.', 4.8, 2700, 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg'),
('Avengers: Endgame', 2019, 181, 'English', 'After Thanos destroys half of all life in the universe, the Avengers must reverse the damage.', 4.5, 3500, 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg'),
('The Shawshank Redemption', 1994, 142, 'English', 'Two imprisoned men bond over years, finding solace and redemption through acts of common decency.', 4.9, 3000, 'https://image.tmdb.org/t/p/w500/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg'),
('Forrest Gump', 1994, 142, 'English', 'The presidencies of Kennedy and Johnson, Vietnam and other historical events unfold from the perspective of an Alabama man.', 4.7, 2600, 'https://image.tmdb.org/t/p/w500/saHP97rTPS5eLmrLQEcANmKrsFl.jpg'),
('The Godfather', 1972, 175, 'English', 'The aging patriarch of an organized crime dynasty transfers control to his reluctant son.', 4.9, 2900, 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsLeBHka4eKGm.jpg');

INSERT INTO Movie_Genres (movie_id, genre_id) VALUES
(1,12),(1,2),(1,7),   -- Inception: Sci-Fi, Adventure, Drama
(2,1),(2,5),(2,13),   -- Dark Knight: Action, Crime, Thriller
(3,1),(3,2),(3,7),    -- RRR: Action, Adventure, Drama
(4,12),(4,2),(4,7),   -- Interstellar: Sci-Fi, Adventure, Drama
(5,4),(5,8),(5,11),   -- Barbie: Comedy, Fantasy, Romance
(6,15),(6,7),(6,13),  -- Oppenheimer: Biography, Drama, Thriller
(7,4),(7,7),(7,11),   -- 3 Idiots: Comedy, Drama, Romance
(8,5),(8,7),(8,13),   -- Parasite: Crime, Drama, Thriller
(9,1),(9,12),(9,2),   -- Endgame: Action, Sci-Fi, Adventure
(10,7),(10,5),        -- Shawshank: Drama, Crime
(11,7),(11,11),       -- Forrest Gump: Drama, Romance
(12,5),(12,7);        -- Godfather: Crime, Drama

INSERT INTO Movie_Cast (movie_id, person_id, role_type) VALUES
(1,1,'Director'),(2,1,'Director'),(4,1,'Director'),(6,1,'Director'),
(9,2,'Director'),(11,8,'Actor'),(3,5,'Director'),(7,3,'Director'),
(8,4,'Director'),(10,2,'Director'),(12,2,'Director'),
(6,10,'Actor'),(5,7,'Actor'),(1,6,'Actor');

INSERT INTO Users (name, email, password_hash, age, gender, location, role) VALUES
('Admin User', 'admin@movierec.com', 'pbkdf2:sha256:admin_hash', 30, 'Other', 'Mumbai', 'admin'),
('Alice Johnson', 'alice@example.com', 'pbkdf2:sha256:alice_hash', 25, 'Female', 'Bangalore', 'user'),
('Bob Smith', 'bob@example.com', 'pbkdf2:sha256:bob_hash', 32, 'Male', 'Delhi', 'user');

INSERT INTO Ratings (user_id, movie_id, score, review_text) VALUES
(2, 1, 5, 'Mind-bending masterpiece! Watch it twice.'),
(2, 2, 5, 'Best superhero film ever made.'),
(2, 4, 5, 'Visually stunning and emotionally powerful.'),
(2, 7, 4, 'Hilarious and heartwarming Bollywood classic.'),
(3, 1, 4, 'Great concept, loved the visuals.'),
(3, 3, 5, 'RRR is an absolute spectacle!'),
(3, 8, 5, 'Parasite is a masterclass in filmmaking.'),
(3, 10, 5, 'Timeless classic, never gets old.');
