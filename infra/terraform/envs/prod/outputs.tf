output "web_url" {
  value = "http://${module.web.alb_dns_name}"
}

output "api_url" {
  value = "http://${module.api.alb_dns_name}"
}

output "ai_internal_url" {
  value = "http://${module.ai.alb_dns_name}"
}

output "db_endpoint" {
  value = module.rds.endpoint
}

output "redis_endpoint" {
  value = module.redis.primary_endpoint
}

output "media_cdn" {
  value = module.media.cdn_domain_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

# release.yml drives `aws ecs update-service` from these
output "service_names" {
  value = {
    web = module.web.service_name
    api = module.api.service_name
    ai  = module.ai.service_name
  }
}
