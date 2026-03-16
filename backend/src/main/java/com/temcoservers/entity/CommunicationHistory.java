package com.temcoservers.entity;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Date;

@Entity
@Table(name = "communication_history")
public class CommunicationHistory implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "recepient_address", length = 1000)
    private String recipientAddress;

    @Column(name = "added_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date addedDate;

    @Column(name = "sent_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date sentDate;

    @Column(name = "is_sent")
    private Boolean isSent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "communication_type_id", nullable = false)
    private CommunicationType communicationType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "communication_purpose_id", nullable = false)
    private CommunicationPurpose communicationPurpose;

    @Column(name = "sent_by")
    private Integer sentBy;

    @Column(name = "sent_to")
    private Integer sentTo;

    // Getters and Setters

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getRecipientAddress() { return recipientAddress; }
    public void setRecipientAddress(String recipientAddress) { this.recipientAddress = recipientAddress; }

    public Date getAddedDate() { return addedDate; }
    public void setAddedDate(Date addedDate) { this.addedDate = addedDate; }

    public Date getSentDate() { return sentDate; }
    public void setSentDate(Date sentDate) { this.sentDate = sentDate; }

    public Boolean getIsSent() { return isSent; }
    public void setIsSent(Boolean isSent) { this.isSent = isSent; }

    public CommunicationType getCommunicationType() { return communicationType; }
    public void setCommunicationType(CommunicationType communicationType) { this.communicationType = communicationType; }

    public CommunicationPurpose getCommunicationPurpose() { return communicationPurpose; }
    public void setCommunicationPurpose(CommunicationPurpose communicationPurpose) { this.communicationPurpose = communicationPurpose; }

    public Integer getSentBy() { return sentBy; }
    public void setSentBy(Integer sentBy) { this.sentBy = sentBy; }

    public Integer getSentTo() { return sentTo; }
    public void setSentTo(Integer sentTo) { this.sentTo = sentTo; }
}
