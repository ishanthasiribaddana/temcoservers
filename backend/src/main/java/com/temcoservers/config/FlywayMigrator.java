package com.temcoservers.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import jakarta.ejb.Singleton;
import jakarta.ejb.Startup;
import jakarta.ejb.TransactionManagement;
import jakarta.ejb.TransactionManagementType;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import java.util.logging.Level;
import java.util.logging.Logger;

@Singleton
@Startup
@TransactionManagement(TransactionManagementType.BEAN)
public class FlywayMigrator {

    private static final Logger LOG = Logger.getLogger(FlywayMigrator.class.getName());

    @Resource(lookup = "java:jboss/datasources/TemcoServersDS")
    private DataSource dataSource;

    @PostConstruct
    public void migrate() {
        LOG.info("=== Flyway: Starting database migration ===");
        try {
            Flyway flyway = Flyway.configure()
                    .dataSource(dataSource)
                    .locations("classpath:db/migration")
                    .baselineOnMigrate(true)
                    .baselineVersion("0")
                    .baselineDescription("Existing TemcoServers schema baseline")
                    .table("flyway_schema_history")
                    .validateMigrationNaming(true)
                    .load();

            var result = flyway.migrate();
            LOG.info("=== Flyway: Migration complete — " + result.migrationsExecuted + " migration(s) applied ===");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "=== Flyway: Migration FAILED ===", e);
            throw new RuntimeException("Flyway migration failed", e);
        }
    }
}
