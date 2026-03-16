package com.temcoservers.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Date;

@Entity
@Table(name = "user_login")
public class UserLogin implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "login_id")
    private Integer loginId;

    @Column(name = "username")
    private String username;

    @Column(name = "password")
    private String password;

    @Column(name = "is_active")
    private Integer isActive;

    @Column(name = "is_multiple_login")
    private Integer isMultipleLogin;

    @Column(name = "max_login_attempt")
    private Integer maxLoginAttempt;

    @Column(name = "generated_password")
    private String generatedPassword;

    @Column(name = "is_first_time")
    private Integer isFirstTime;

    @Column(name = "count_attempt")
    private Integer countAttempt;

    @Column(name = "answer", columnDefinition = "TEXT")
    private String answer;

    @Column(name = "last_reset")
    @Temporal(TemporalType.TIMESTAMP)
    private Date lastReset;

    @Column(name = "is_due")
    private Integer isDue;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "general_user_profilegup_id", nullable = false)
    private GeneralUserProfile generalUserProfile;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_role_ur_id", nullable = false)
    private UserRole userRole;

    @Column(name = "system_interface_si_id")
    private Integer systemInterfaceSiId;

    @Column(name = "security_questionid_sq")
    private Integer securityQuestionIdSq;

    @Column(name = "general_organization_profile_id_gop")
    private Integer generalOrganizationProfileIdGop;

    @Column(name = "user_login_type_id")
    private Integer userLoginTypeId;

    // Getters and Setters

    public Integer getLoginId() { return loginId; }
    public void setLoginId(Integer loginId) { this.loginId = loginId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Integer getIsActive() { return isActive; }
    public void setIsActive(Integer isActive) { this.isActive = isActive; }

    public Integer getIsMultipleLogin() { return isMultipleLogin; }
    public void setIsMultipleLogin(Integer isMultipleLogin) { this.isMultipleLogin = isMultipleLogin; }

    public Integer getMaxLoginAttempt() { return maxLoginAttempt; }
    public void setMaxLoginAttempt(Integer maxLoginAttempt) { this.maxLoginAttempt = maxLoginAttempt; }

    public String getGeneratedPassword() { return generatedPassword; }
    public void setGeneratedPassword(String generatedPassword) { this.generatedPassword = generatedPassword; }

    public Integer getIsFirstTime() { return isFirstTime; }
    public void setIsFirstTime(Integer isFirstTime) { this.isFirstTime = isFirstTime; }

    public Integer getCountAttempt() { return countAttempt; }
    public void setCountAttempt(Integer countAttempt) { this.countAttempt = countAttempt; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public Date getLastReset() { return lastReset; }
    public void setLastReset(Date lastReset) { this.lastReset = lastReset; }

    public Integer getIsDue() { return isDue; }
    public void setIsDue(Integer isDue) { this.isDue = isDue; }

    public GeneralUserProfile getGeneralUserProfile() { return generalUserProfile; }
    public void setGeneralUserProfile(GeneralUserProfile generalUserProfile) { this.generalUserProfile = generalUserProfile; }

    public UserRole getUserRole() { return userRole; }
    public void setUserRole(UserRole userRole) { this.userRole = userRole; }

    public Integer getSystemInterfaceSiId() { return systemInterfaceSiId; }
    public void setSystemInterfaceSiId(Integer systemInterfaceSiId) { this.systemInterfaceSiId = systemInterfaceSiId; }

    public Integer getSecurityQuestionIdSq() { return securityQuestionIdSq; }
    public void setSecurityQuestionIdSq(Integer securityQuestionIdSq) { this.securityQuestionIdSq = securityQuestionIdSq; }

    public Integer getGeneralOrganizationProfileIdGop() { return generalOrganizationProfileIdGop; }
    public void setGeneralOrganizationProfileIdGop(Integer generalOrganizationProfileIdGop) { this.generalOrganizationProfileIdGop = generalOrganizationProfileIdGop; }

    public Integer getUserLoginTypeId() { return userLoginTypeId; }
    public void setUserLoginTypeId(Integer userLoginTypeId) { this.userLoginTypeId = userLoginTypeId; }
}
