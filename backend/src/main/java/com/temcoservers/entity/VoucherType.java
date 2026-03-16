package com.temcoservers.entity;

import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "voucher_type")
public class VoucherType implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vt_id")
    private Integer vtId;

    @Column(name = "name")
    private String name;

    @Column(name = "id_abbreviation")
    private String idAbbreviation;

    public Integer getVtId() { return vtId; }
    public void setVtId(Integer vtId) { this.vtId = vtId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getIdAbbreviation() { return idAbbreviation; }
    public void setIdAbbreviation(String idAbbreviation) { this.idAbbreviation = idAbbreviation; }
}
