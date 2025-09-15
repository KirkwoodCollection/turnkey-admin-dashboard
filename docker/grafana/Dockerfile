FROM grafana/grafana:10.2.0

# Install required plugins for BigQuery and JSON API datasources
ENV GF_INSTALL_PLUGINS=grafana-bigquery-datasource,marcusolsson-json-datasource

# Copy provisioning configurations
COPY provisioning/ /etc/grafana/provisioning/

# Copy dashboard templates
COPY dashboards/ /var/lib/grafana/dashboards/

# Set proper permissions
USER root
RUN chown -R grafana:grafana /var/lib/grafana/dashboards \
    && chown -R grafana:grafana /etc/grafana/provisioning

# Switch back to grafana user
USER grafana

# Expose Grafana port
EXPOSE 3000