# Stage 1: Build WAR with Maven
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src/ src/
RUN mvn clean package -DskipTests -B

# Stage 2: WildFly runtime
FROM quay.io/wildfly/wildfly:30.0.1.Final-jdk17

# Add MariaDB JDBC driver module
COPY --chown=jboss:jboss modules/ /opt/jboss/wildfly/modules/

# Add CLI script to configure datasource
COPY --chown=jboss:jboss configure-ds.cli /tmp/configure-ds.cli

# Run CLI in embedded mode to configure datasource on default standalone.xml
RUN /opt/jboss/wildfly/bin/jboss-cli.sh --file=/tmp/configure-ds.cli

# Pre-create upload directories with correct ownership
USER root
RUN mkdir -p /opt/temcoservers/uploads/slips && chown -R jboss:jboss /opt/temcoservers
USER jboss

# Deploy the built WAR
COPY --chown=jboss:jboss --from=builder /build/target/temcoservers.war /opt/jboss/wildfly/standalone/deployments/

EXPOSE 8080 9990

CMD ["/opt/jboss/wildfly/bin/standalone.sh", "-b", "0.0.0.0", "-bmanagement", "0.0.0.0"]
