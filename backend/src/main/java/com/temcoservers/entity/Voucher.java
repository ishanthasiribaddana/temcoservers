package com.temcoservers.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Date;

@Entity
@Table(name = "voucher")
public class Voucher implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vid")
    private Integer vid;

    @Column(name = "id")
    private String id;

    @Column(name = "description", length = 6000)
    private String description;

    @Column(name = "date")
    @Temporal(TemporalType.DATE)
    private Date date;

    @Column(name = "voucher_total")
    private Double voucherTotal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "general_user_profilegup_id", nullable = false)
    private GeneralUserProfile generalUserProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_typevt_id", nullable = false)
    private VoucherType voucherType;

    @Column(name = "login_sessionsession_id")
    private Integer loginSessionId;

    @Column(name = "user_loginlogin_id")
    private Integer userLoginId;

    @Column(name = "branch_bid")
    private Integer branchBid;

    @Column(name = "is_active")
    private Integer isActive;

    @Column(name = "payment_date")
    @Temporal(TemporalType.DATE)
    private Date paymentDate;

    @Column(name = "due")
    private Double due;

    @Column(name = "total_paid")
    private Double totalPaid;

    @Column(name = "is_completed")
    private Boolean isCompleted;

    @Column(name = "payment_mode_payment_mode_id")
    private Integer paymentModeId;

    @Column(name = "general_organization_profile_id_gop")
    private Integer generalOrganizationProfileIdGop;

    @Column(name = "shipping_fee")
    private Double shippingFee;

    @Column(name = "time")
    @Temporal(TemporalType.TIME)
    private Date time;

    @Column(name = "online_transactions_id")
    private Integer onlineTransactionsId;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Column(name = "updated_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // Getters and Setters

    public Integer getVid() { return vid; }
    public void setVid(Integer vid) { this.vid = vid; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Date getDate() { return date; }
    public void setDate(Date date) { this.date = date; }

    public Double getVoucherTotal() { return voucherTotal; }
    public void setVoucherTotal(Double voucherTotal) { this.voucherTotal = voucherTotal; }

    public GeneralUserProfile getGeneralUserProfile() { return generalUserProfile; }
    public void setGeneralUserProfile(GeneralUserProfile generalUserProfile) { this.generalUserProfile = generalUserProfile; }

    public VoucherType getVoucherType() { return voucherType; }
    public void setVoucherType(VoucherType voucherType) { this.voucherType = voucherType; }

    public Integer getLoginSessionId() { return loginSessionId; }
    public void setLoginSessionId(Integer loginSessionId) { this.loginSessionId = loginSessionId; }

    public Integer getUserLoginId() { return userLoginId; }
    public void setUserLoginId(Integer userLoginId) { this.userLoginId = userLoginId; }

    public Integer getBranchBid() { return branchBid; }
    public void setBranchBid(Integer branchBid) { this.branchBid = branchBid; }

    public Integer getIsActive() { return isActive; }
    public void setIsActive(Integer isActive) { this.isActive = isActive; }

    public Date getPaymentDate() { return paymentDate; }
    public void setPaymentDate(Date paymentDate) { this.paymentDate = paymentDate; }

    public Double getDue() { return due; }
    public void setDue(Double due) { this.due = due; }

    public Double getTotalPaid() { return totalPaid; }
    public void setTotalPaid(Double totalPaid) { this.totalPaid = totalPaid; }

    public Boolean getIsCompleted() { return isCompleted; }
    public void setIsCompleted(Boolean isCompleted) { this.isCompleted = isCompleted; }

    public Integer getPaymentModeId() { return paymentModeId; }
    public void setPaymentModeId(Integer paymentModeId) { this.paymentModeId = paymentModeId; }

    public Integer getGeneralOrganizationProfileIdGop() { return generalOrganizationProfileIdGop; }
    public void setGeneralOrganizationProfileIdGop(Integer gop) { this.generalOrganizationProfileIdGop = gop; }

    public Double getShippingFee() { return shippingFee; }
    public void setShippingFee(Double shippingFee) { this.shippingFee = shippingFee; }

    public Date getTime() { return time; }
    public void setTime(Date time) { this.time = time; }

    public Integer getOnlineTransactionsId() { return onlineTransactionsId; }
    public void setOnlineTransactionsId(Integer onlineTransactionsId) { this.onlineTransactionsId = onlineTransactionsId; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }

    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
