package com.temcoservers.entity;

import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "user_role")
public class UserRole implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ur_id")
    private Integer urId;

    @Column(name = "role_name")
    private String roleName;

    @Column(name = "role_order")
    private Integer roleOrder;

    public Integer getUrId() { return urId; }
    public void setUrId(Integer urId) { this.urId = urId; }

    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }

    public Integer getRoleOrder() { return roleOrder; }
    public void setRoleOrder(Integer roleOrder) { this.roleOrder = roleOrder; }
}
