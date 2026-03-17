package com.temcoservers.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Date;

@Entity
@Table(name = "ts_voucher_item_slip")
public class TsVoucherItemSlip implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "voucher_item_vi_id", nullable = false, unique = true)
    private Integer voucherItemViId;

    @Column(name = "slip_url", nullable = false, length = 500)
    private String slipUrl;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "file_size")
    private Integer fileSize;

    @Column(name = "uploaded_by_login_id")
    private Integer uploadedByLoginId;

    @Column(name = "verification_status", nullable = false, length = 20)
    private String verificationStatus = "pending";

    @Column(name = "verified_by_login_id")
    private Integer verifiedByLoginId;

    @Column(name = "verified_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date verifiedAt;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    // Getters and Setters

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getVoucherItemViId() { return voucherItemViId; }
    public void setVoucherItemViId(Integer voucherItemViId) { this.voucherItemViId = voucherItemViId; }

    public String getSlipUrl() { return slipUrl; }
    public void setSlipUrl(String slipUrl) { this.slipUrl = slipUrl; }

    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

    public Integer getFileSize() { return fileSize; }
    public void setFileSize(Integer fileSize) { this.fileSize = fileSize; }

    public Integer getUploadedByLoginId() { return uploadedByLoginId; }
    public void setUploadedByLoginId(Integer uploadedByLoginId) { this.uploadedByLoginId = uploadedByLoginId; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public Integer getVerifiedByLoginId() { return verifiedByLoginId; }
    public void setVerifiedByLoginId(Integer verifiedByLoginId) { this.verifiedByLoginId = verifiedByLoginId; }

    public Date getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(Date verifiedAt) { this.verifiedAt = verifiedAt; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
