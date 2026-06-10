package com.cinematch.util;

import java.util.List;
import java.util.Map;

public final class MoodProfiles {

    public record MoodProfile(List<String> genres, List<String> keywords, List<String> exclude) {
    }

    public record MoodMatch(String key, MoodProfile profile) {
    }

    private static final Map<String, MoodProfile> MOOD_PROFILES = Map.ofEntries(
            entry("happy", List.of("Comedy", "Musical", "Animation", "Family"),
                    List.of("joy", "laugh", "fun", "celebrate", "uplifting", "heartwarming", "friendship", "cheerful", "comedy", "humor", "wedding", "festival", "dance", "party", "bright"),
                    List.of("Horror", "Crime", "War", "Thriller")),
            entry("cheerful", List.of("Comedy", "Musical", "Animation", "Family"),
                    List.of("joy", "celebration", "happiness", "fun", "festive", "bright", "colorful", "laugh", "dance"),
                    List.of("Horror", "Thriller", "Crime", "War")),
            entry("sad", List.of("Drama"),
                    List.of("loss", "death", "grief", "tears", "emotional", "tragic", "heartbreak", "separation", "farewell", "sacrifice", "struggle", "suffering", "lonely", "sorrow", "pain"),
                    List.of("Comedy", "Animation", "Action", "Musical")),
            entry("melancholy", List.of("Drama", "Romance"),
                    List.of("sorrow", "loss", "memory", "rain", "bittersweet", "longing", "alone", "farewell", "regret", "past"),
                    List.of("Action", "Comedy", "Animation")),
            entry("excited", List.of("Action", "Adventure", "Sci-Fi", "Science Fiction"),
                    List.of("chase", "battle", "explosion", "hero", "mission", "fight", "power", "epic", "warrior", "speed", "adrenaline", "intense"),
                    List.of("Drama", "Romance", "Family")),
            entry("thrilled", List.of("Action", "Thriller"),
                    List.of("intense", "edge", "breathtaking", "adrenaline", "danger", "suspense", "climax", "explosive"),
                    List.of("Romance", "Family", "Animation")),
            entry("scared", List.of("Horror", "Thriller"),
                    List.of("ghost", "haunted", "murder", "dark", "death", "fear", "terror", "supernatural", "killer", "suspense", "creepy", "evil", "demon", "curse", "horror", "nightmare"),
                    List.of("Comedy", "Animation", "Family", "Musical", "Romance", "Biography")),
            entry("spooky", List.of("Horror", "Thriller", "Mystery"),
                    List.of("ghost", "haunted", "paranormal", "curse", "demon", "evil", "supernatural", "possession", "nightmare"),
                    List.of("Comedy", "Romance", "Family", "Musical")),
            entry("romantic", List.of("Romance"),
                    List.of("love", "romance", "couple", "relationship", "heart", "passion", "wedding", "marriage", "dating", "soulmate", "kiss", "destiny", "together"),
                    List.of("Horror", "Crime", "War", "Action")),
            entry("love", List.of("Romance", "Drama"),
                    List.of("love", "romance", "couple", "heart", "passion", "wedding", "relationship", "devotion", "eternal"),
                    List.of("Horror", "Crime", "War")),
            entry("adventurous", List.of("Adventure", "Action", "Fantasy", "Sci-Fi", "Science Fiction"),
                    List.of("journey", "quest", "explore", "discover", "treasure", "world", "hero", "epic", "kingdom", "space", "expedition", "survival"),
                    List.of("Romance", "Horror")),
            entry("relaxed", List.of("Comedy", "Animation", "Family"),
                    List.of("peaceful", "calm", "gentle", "nature", "simple", "life", "village", "countryside", "friendship", "warm", "cozy", "sweet"),
                    List.of("Horror", "Thriller", "Action", "Crime", "War")),
            entry("chill", List.of("Comedy", "Animation", "Family"),
                    List.of("relax", "easy", "lighthearted", "fun", "casual", "simple", "feel-good"),
                    List.of("Horror", "Thriller", "Action", "Crime")),
            entry("angry", List.of("Action", "Crime", "Thriller"),
                    List.of("revenge", "justice", "fight", "battle", "war", "rebel", "rage", "destroy", "confront", "vendetta", "betrayal", "fury"),
                    List.of("Romance", "Comedy", "Animation", "Family", "Musical")),
            entry("frustrated", List.of("Action", "Thriller", "Crime"),
                    List.of("revenge", "fight", "struggle", "overcome", "justice", "against", "rebel"),
                    List.of("Romance", "Comedy", "Animation", "Family")),
            entry("bored", List.of("Adventure", "Action", "Comedy", "Sci-Fi", "Science Fiction", "Fantasy"),
                    List.of("epic", "amazing", "incredible", "spectacular", "blockbuster", "thrilling", "exciting", "mind-blowing"),
                    List.of()),
            entry("nostalgic", List.of("Drama", "Family", "Animation"),
                    List.of("childhood", "memory", "past", "growing up", "home", "family", "classic", "tradition", "heritage", "remember", "old", "youth", "school"),
                    List.of("Horror", "Crime", "Thriller")),
            entry("curious", List.of("Mystery", "Sci-Fi", "Science Fiction", "Thriller"),
                    List.of("mystery", "investigation", "discover", "secret", "puzzle", "detective", "clue", "conspiracy", "unknown", "truth", "riddle", "experiment"),
                    List.of("Comedy", "Musical", "Family")),
            entry("energetic", List.of("Action", "Adventure", "Musical"),
                    List.of("dance", "fight", "race", "competition", "battle", "sport", "energy", "music", "party", "champion", "power"),
                    List.of("Drama", "Horror")),
            entry("lonely", List.of("Romance", "Drama"),
                    List.of("love", "friendship", "connection", "relationship", "companion", "together", "bond", "meet", "stranger"),
                    List.of("Horror", "War", "Crime")),
            entry("inspired", List.of("Drama", "Biography"),
                    List.of("dream", "achieve", "overcome", "success", "struggle", "triumph", "hero", "journey", "inspiring", "hope", "rise", "change", "courage"),
                    List.of("Horror", "Crime", "Thriller")),
            entry("motivated", List.of("Drama", "Action", "Adventure", "Biography"),
                    List.of("champion", "winner", "train", "overcome", "achieve", "goal", "rise", "fight", "determination", "never give up", "victory"),
                    List.of("Horror")),
            entry("dark", List.of("Horror", "Thriller", "Crime", "Mystery"),
                    List.of("dark", "death", "murder", "evil", "sinister", "twisted", "psychological", "nightmare", "corrupt", "shadow"),
                    List.of("Comedy", "Animation", "Family", "Musical")),
            entry("funny", List.of("Comedy", "Animation"),
                    List.of("funny", "hilarious", "comedy", "laugh", "humor", "comic", "silly", "parody", "satire", "prank", "joke", "witty"),
                    List.of("Horror", "Crime", "Thriller", "War")),
            entry("tense", List.of("Thriller", "Mystery", "Crime"),
                    List.of("suspense", "tension", "nerve", "edge", "twist", "chase", "escape", "trapped", "danger", "stakes", "countdown"),
                    List.of("Comedy", "Animation", "Family", "Musical")),
            entry("peaceful", List.of("Drama", "Animation", "Family"),
                    List.of("nature", "calm", "serene", "quiet", "gentle", "beautiful", "meditative", "spiritual", "garden", "mountain"),
                    List.of("Action", "Horror", "Thriller", "Crime", "War"))
    );

    private static final MoodProfile DEFAULT_PROFILE = new MoodProfile(
            List.of("Drama", "Comedy", "Action", "Romance"), List.of(), List.of());

    private MoodProfiles() {
    }

    private static Map.Entry<String, MoodProfile> entry(String key, List<String> genres, List<String> keywords, List<String> exclude) {
        return Map.entry(key, new MoodProfile(genres, keywords, exclude));
    }

    public static MoodMatch getMoodProfile(String moodInput) {
        String mood = moodInput == null ? "" : moodInput.toLowerCase().trim();
        for (Map.Entry<String, MoodProfile> entry : MOOD_PROFILES.entrySet()) {
            String key = entry.getKey();
            if (mood.equals(key) || mood.contains(key) || key.contains(mood)) {
                return new MoodMatch(key, entry.getValue());
            }
        }
        return new MoodMatch("default", DEFAULT_PROFILE);
    }

    @SuppressWarnings("unchecked")
    public static double scoreMovieForMood(Map<String, Object> movie, MoodProfile profile, String moodKey) {
        List<String> genres;
        Object genresObj = movie.get("genres");
        if (genresObj instanceof List<?> list) {
            genres = list.stream().map(String::valueOf).toList();
        } else {
            genres = List.of();
        }

        if (genres.stream().anyMatch(g -> profile.exclude().contains(g))) {
            return 0;
        }

        double score = 0;
        String synopsis = String.valueOf(movie.getOrDefault("synopsis", "")).toLowerCase();
        String title = String.valueOf(movie.getOrDefault("title", "")).toLowerCase();

        score += genres.stream().filter(g -> profile.genres().contains(g)).count() * 3;

        for (String kw : profile.keywords()) {
            if (synopsis.contains(kw)) {
                score += 2;
            }
            if (title.contains(kw)) {
                score += 1;
            }
        }

        score += toDouble(movie.get("avg_rating"));

        boolean hasPreferredGenre = genres.stream().anyMatch(g -> profile.genres().contains(g));
        if (!profile.genres().isEmpty() && !hasPreferredGenre) {
            return 0;
        }

        if ("scared".equals(moodKey) || "spooky".equals(moodKey)) {
            boolean hasHorror = genres.contains("Horror");
            boolean hasThriller = genres.contains("Thriller");
            if (hasThriller && !hasHorror) {
                boolean horrorSignal = profile.keywords().stream()
                        .anyMatch(kw -> synopsis.contains(kw) || title.contains(kw));
                if (!horrorSignal) {
                    return 0;
                }
            }
            if (hasHorror) {
                score += 4;
            }
        }

        if (List.of("happy", "cheerful", "relaxed", "chill").contains(moodKey)) {
            if (genres.contains("Crime") || genres.contains("War")) {
                return 0;
            }
        }

        if (List.of("romantic", "love").contains(moodKey) && !genres.contains("Romance")) {
            return 0;
        }

        return score > 2 ? score : 0;
    }

    private static double toDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value == null) {
            return 0;
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
