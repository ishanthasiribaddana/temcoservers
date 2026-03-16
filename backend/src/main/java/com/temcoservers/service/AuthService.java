package com.temcoservers.service;

import com.temcoservers.entity.GeneralUserProfile;
import com.temcoservers.entity.UserLogin;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.mindrot.jbcrypt.BCrypt;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Stateless
public class AuthService {

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    private static final String JWT_SECRET = System.getenv("JWT_SECRET") != null
            ? System.getenv("JWT_SECRET")
            : "TemcoServers-JWT-Secret-2026-Change-In-Production";

    private static final long TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

    public Map<String, Object> authenticate(String username, String password) {
        TypedQuery<UserLogin> query = em.createQuery(
                "SELECT ul FROM UserLogin ul " +
                "JOIN FETCH ul.generalUserProfile " +
                "JOIN FETCH ul.userRole " +
                "WHERE ul.username = :username AND ul.isActive = 1",
                UserLogin.class
        );
        query.setParameter("username", username);

        List<UserLogin> results = query.getResultList();
        if (results.isEmpty()) {
            throw new SecurityException("Invalid username or password");
        }

        UserLogin userLogin = results.get(0);

        // BCrypt password verification
        if (!BCrypt.checkpw(password, userLogin.getPassword())) {
            throw new SecurityException("Invalid username or password");
        }

        GeneralUserProfile profile = userLogin.getGeneralUserProfile();
        String roleName = userLogin.getUserRole().getRoleName();

        String token = generateToken(
                userLogin.getLoginId(),
                profile.getGupId(),
                username,
                roleName
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", token);
        result.put("loginId", userLogin.getLoginId());
        result.put("gupId", profile.getGupId());
        result.put("username", username);
        result.put("role", roleName);
        result.put("firstName", profile.getFirstName());
        result.put("lastName", profile.getLastName());
        result.put("email", profile.getEmail());
        result.put("mobile", profile.getMobilePhone());
        result.put("profileImage", profile.getImg());

        return result;
    }

    public Map<String, Object> getUserFromToken(String token) {
        var claims = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .build()
                .parseSignedClaims(token)
                .getPayload();

        int gupId = claims.get("gupId", Integer.class);

        GeneralUserProfile profile = em.find(GeneralUserProfile.class, gupId);
        if (profile == null) {
            throw new SecurityException("User not found");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("loginId", claims.get("loginId", Integer.class));
        result.put("gupId", profile.getGupId());
        result.put("username", claims.getSubject());
        result.put("role", claims.get("role", String.class));
        result.put("firstName", profile.getFirstName());
        result.put("lastName", profile.getLastName());
        result.put("email", profile.getEmail());
        result.put("mobile", profile.getMobilePhone());
        result.put("profileImage", profile.getImg());

        return result;
    }

    private String generateToken(int loginId, int gupId, String username, String role) {
        return Jwts.builder()
                .subject(username)
                .claim("loginId", loginId)
                .claim("gupId", gupId)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + TOKEN_EXPIRY_MS))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
