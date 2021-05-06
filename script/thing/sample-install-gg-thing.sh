THING_NAME=cky-thing-03
THING_GROUP=cky-thing-group
REGION=ap-northeast-2
DEV_ENV=true
ROLE_NAME=IotDataDev-GreengrassV2TokenExchangeRole
ROLE_ALIAS_NAME=IotDataDev-GreengrassV2TokenExchangeRoleAlias

AWS_ACCESS_KEY_ID=ASIAQJYCN5CIYJIK2SOQ
AWS_SECRET_ACCESS_KEY=1BITxxkhK/Hh7TI93GtkTGkYBK124iv1k1t5sOfj
AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEH8aDmFwLW5vcnRoZWFzdC0yIkcwRQIgIqUPUWHlnzHjOOqA+S1JNN/SHrYJY4FQnOPGDKT7PsMCIQC4dnQ5Ibd/w4OVrqfh6R21AjDIyH7KQDmHKp8POIp0LCqnAgiI//////////8BEAAaDDAyMDk0MzA3MTM3NyIMo3wLnSKNCnx7l1TrKvsBUIhMYUjQXNBZZJMlbDrdSzlWL54/fY2ADB1XYRpA2n0UpYgY1Tt6LYmwcm79GYzDxf9WBHkYT/GDM7JCqrg3C+w7Jle33xQTW1RykIwPzotbgCP5fsrmTD8+7wSsb1V5UEz23zQH/KMq4c2PY7qt0cj20JVC9aWmGsuwGwhxZncftv7e/4Xwwmo3qjz9BJHgeQUeQkQWdquwjS4GM1S8reO5rhEeiqP+t26TFdl2+DbitobnqcoOJQXhIk5XDVnLmJGs7j+7dEUgz+LTeVJn0D4Ne2TRO3VZNJlEAv7tRGh+I1GR7VfYWxuy3H8CafcQNY4guOHkUa9almEwvcm9gQY6nQG4B9HNKRqRhnTOycu367G7OKBYZGEzMV0/kCu1grKUt/Q/7cHR3C0DLlvWgQG0lPocOYd91WqbB/ecm2aJLJTarhjOdJyvfosh3tiQf3RQkODwPxvD6+kLHiuRCbqGRmia1qb2C3lAcpqO2PrE+b+5h+fsbcQ40VNkc8Z4oN06OXP0jcS5R0uuqLOJPwsWUR+d1JbKvHsA6IB57+fq

java -version

mkdir greengrass
cd greengrass
INSTALL_ROOT=GreengrassCore
curl -s https://d2s8p88vqu9w66.cloudfront.net/releases/greengrass-nucleus-latest.zip > greengrass-nucleus-latest.zip && unzip greengrass-nucleus-latest.zip -d GreengrassCore

GREENGRASS_ROOT=/greengrass/v2
GREENGRASS_JAR=./GreengrassCore/lib/Greengrass.jar
sudo -E java -Droot=$GREENGRASS_ROOT \
  -Dlog.store=FILE \
  -jar $GREENGRASS_JAR \
  --aws-region $REGION \
  --thing-name $THING_NAME \
  --thing-group-name $THING_GROUP \
  --tes-role-name $ROLE_NAME \
  --tes-role-alias-name $ROLE_ALIAS_NAME \
  --component-default-user ggc_user:ggc_group \
  --provision true \
  --setup-system-service true
