package com.temcoservers.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Date;

@Entity
@Table(name = "general_user_profile")
public class GeneralUserProfile implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gup_id")
    private Integer gupId;

    @Column(name = "nic")
    private String nic;

    @Column(name = "title")
    private String title;

    @Column(name = "first_name", length = 1000)
    private String firstName;

    @Column(name = "last_name", length = 1000)
    private String lastName;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "mid_name")
    private String midName;

    @Column(name = "email")
    private String email;

    @Column(name = "mobile_phone")
    private String mobilePhone;

    @Column(name = "home_phone")
    private String homePhone;

    @Column(name = "office_phone")
    private String officePhone;

    @Column(name = "gender")
    private String gender;

    @Column(name = "dob")
    @Temporal(TemporalType.DATE)
    private Date dob;

    @Column(name = "address1", length = 1000)
    private String address1;

    @Column(name = "address2", length = 1000)
    private String address2;

    @Column(name = "address3", length = 1000)
    private String address3;

    @Column(name = "address")
    private String address;

    @Column(name = "contact_no")
    private String contactNo;

    @Column(name = "postal_code")
    private String postalCode;

    @Column(name = "img")
    private String img;

    @Column(name = "about_me", columnDefinition = "TEXT")
    private String aboutMe;

    @Column(name = "is_active")
    private Integer isActive;

    @Column(name = "is_mail_verified")
    private Boolean isMailVerified;

    @Column(name = "profile_created_date")
    @Temporal(TemporalType.DATE)
    private Date profileCreatedDate;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Column(name = "updated_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // Getters and Setters

    public Integer getGupId() { return gupId; }
    public void setGupId(Integer gupId) { this.gupId = gupId; }

    public String getNic() { return nic; }
    public void setNic(String nic) { this.nic = nic; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getMidName() { return midName; }
    public void setMidName(String midName) { this.midName = midName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMobilePhone() { return mobilePhone; }
    public void setMobilePhone(String mobilePhone) { this.mobilePhone = mobilePhone; }

    public String getHomePhone() { return homePhone; }
    public void setHomePhone(String homePhone) { this.homePhone = homePhone; }

    public String getOfficePhone() { return officePhone; }
    public void setOfficePhone(String officePhone) { this.officePhone = officePhone; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public Date getDob() { return dob; }
    public void setDob(Date dob) { this.dob = dob; }

    public String getAddress1() { return address1; }
    public void setAddress1(String address1) { this.address1 = address1; }

    public String getAddress2() { return address2; }
    public void setAddress2(String address2) { this.address2 = address2; }

    public String getAddress3() { return address3; }
    public void setAddress3(String address3) { this.address3 = address3; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getContactNo() { return contactNo; }
    public void setContactNo(String contactNo) { this.contactNo = contactNo; }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

    public String getImg() { return img; }
    public void setImg(String img) { this.img = img; }

    public String getAboutMe() { return aboutMe; }
    public void setAboutMe(String aboutMe) { this.aboutMe = aboutMe; }

    public Integer getIsActive() { return isActive; }
    public void setIsActive(Integer isActive) { this.isActive = isActive; }

    public Boolean getIsMailVerified() { return isMailVerified; }
    public void setIsMailVerified(Boolean isMailVerified) { this.isMailVerified = isMailVerified; }

    public Date getProfileCreatedDate() { return profileCreatedDate; }
    public void setProfileCreatedDate(Date profileCreatedDate) { this.profileCreatedDate = profileCreatedDate; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }

    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
