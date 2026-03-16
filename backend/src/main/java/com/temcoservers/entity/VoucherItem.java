package com.temcoservers.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Date;

@Entity
@Table(name = "voucher_item")
public class VoucherItem implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vi_id")
    private Integer viId;

    @Column(name = "id")
    private String id;

    @Column(name = "description")
    private String description;

    @Column(name = "date")
    @Temporal(TemporalType.DATE)
    private Date date;

    @Column(name = "is_active")
    private Integer isActive;

    @Column(name = "amount")
    private Double amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vouchervid", nullable = false)
    private Voucher voucher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_typevt_id", nullable = false)
    private VoucherType voucherType;

    @Column(name = "user_loginlogin_id")
    private Integer userLoginId;

    @Column(name = "login_sessionsession_id")
    private Integer loginSessionId;

    @Column(name = "sub_chart_of_accountis_sca")
    private Integer subChartOfAccountIsSca;

    @Column(name = "voucher_item_vi_id")
    private Integer parentVoucherItemId;

    @Column(name = "is_deleted")
    private Boolean isDeleted;

    @Column(name = "nbt_amount")
    private Double nbtAmount;

    @Column(name = "is_completed")
    private Boolean isCompleted;

    @Column(name = "org_item_id")
    private Integer orgItemId;

    @Column(name = "qty")
    private Double qty;

    @Column(name = "unit_price")
    private Double unitPrice;

    @Column(name = "payment_mode_payment_mode_id")
    private Integer paymentModeId;

    @Column(name = "to_be_paid_amount")
    private Double toBePaidAmount;

    @Column(name = "discount_percentage")
    private Double discountPercentage;

    @Column(name = "discount_value")
    private Double discountValue;

    @Column(name = "discounted_amount")
    private Double discountedAmount;

    @Column(name = "due_amount")
    private Double dueAmount;

    @Column(name = "offer_manager_id")
    private Integer offerManagerId;

    @Column(name = "time")
    @Temporal(TemporalType.TIME)
    private Date time;

    @Column(name = "other_currency_amount")
    private Double otherCurrencyAmount;

    @Column(name = "bank_reference_no")
    private String bankReferenceNo;

    @Column(name = "created_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @Column(name = "updated_at")
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @Column(name = "student_batches_id")
    private Integer studentBatchesId;

    @Column(name = "student_s_id")
    private Integer studentSId;

    // Getters and Setters

    public Integer getViId() { return viId; }
    public void setViId(Integer viId) { this.viId = viId; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Date getDate() { return date; }
    public void setDate(Date date) { this.date = date; }

    public Integer getIsActive() { return isActive; }
    public void setIsActive(Integer isActive) { this.isActive = isActive; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public Voucher getVoucher() { return voucher; }
    public void setVoucher(Voucher voucher) { this.voucher = voucher; }

    public VoucherType getVoucherType() { return voucherType; }
    public void setVoucherType(VoucherType voucherType) { this.voucherType = voucherType; }

    public Integer getUserLoginId() { return userLoginId; }
    public void setUserLoginId(Integer userLoginId) { this.userLoginId = userLoginId; }

    public Integer getLoginSessionId() { return loginSessionId; }
    public void setLoginSessionId(Integer loginSessionId) { this.loginSessionId = loginSessionId; }

    public Integer getSubChartOfAccountIsSca() { return subChartOfAccountIsSca; }
    public void setSubChartOfAccountIsSca(Integer sca) { this.subChartOfAccountIsSca = sca; }

    public Integer getParentVoucherItemId() { return parentVoucherItemId; }
    public void setParentVoucherItemId(Integer id) { this.parentVoucherItemId = id; }

    public Boolean getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Boolean isDeleted) { this.isDeleted = isDeleted; }

    public Double getNbtAmount() { return nbtAmount; }
    public void setNbtAmount(Double nbtAmount) { this.nbtAmount = nbtAmount; }

    public Boolean getIsCompleted() { return isCompleted; }
    public void setIsCompleted(Boolean isCompleted) { this.isCompleted = isCompleted; }

    public Integer getOrgItemId() { return orgItemId; }
    public void setOrgItemId(Integer orgItemId) { this.orgItemId = orgItemId; }

    public Double getQty() { return qty; }
    public void setQty(Double qty) { this.qty = qty; }

    public Double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Double unitPrice) { this.unitPrice = unitPrice; }

    public Integer getPaymentModeId() { return paymentModeId; }
    public void setPaymentModeId(Integer paymentModeId) { this.paymentModeId = paymentModeId; }

    public Double getToBePaidAmount() { return toBePaidAmount; }
    public void setToBePaidAmount(Double toBePaidAmount) { this.toBePaidAmount = toBePaidAmount; }

    public Double getDiscountPercentage() { return discountPercentage; }
    public void setDiscountPercentage(Double discountPercentage) { this.discountPercentage = discountPercentage; }

    public Double getDiscountValue() { return discountValue; }
    public void setDiscountValue(Double discountValue) { this.discountValue = discountValue; }

    public Double getDiscountedAmount() { return discountedAmount; }
    public void setDiscountedAmount(Double discountedAmount) { this.discountedAmount = discountedAmount; }

    public Double getDueAmount() { return dueAmount; }
    public void setDueAmount(Double dueAmount) { this.dueAmount = dueAmount; }

    public Integer getOfferManagerId() { return offerManagerId; }
    public void setOfferManagerId(Integer offerManagerId) { this.offerManagerId = offerManagerId; }

    public Date getTime() { return time; }
    public void setTime(Date time) { this.time = time; }

    public Double getOtherCurrencyAmount() { return otherCurrencyAmount; }
    public void setOtherCurrencyAmount(Double otherCurrencyAmount) { this.otherCurrencyAmount = otherCurrencyAmount; }

    public String getBankReferenceNo() { return bankReferenceNo; }
    public void setBankReferenceNo(String bankReferenceNo) { this.bankReferenceNo = bankReferenceNo; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }

    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }

    public Integer getStudentBatchesId() { return studentBatchesId; }
    public void setStudentBatchesId(Integer studentBatchesId) { this.studentBatchesId = studentBatchesId; }

    public Integer getStudentSId() { return studentSId; }
    public void setStudentSId(Integer studentSId) { this.studentSId = studentSId; }
}
