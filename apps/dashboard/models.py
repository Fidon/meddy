from django.db import models

# Activity model
class Activity(models.Model):
    id = models.AutoField(primary_key=True)
    categ = models.CharField(max_length=255)
    title = models.CharField(max_length=255, null=True, default=None)
    maelezo = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Activity"
        verbose_name_plural = "Activities"
        ordering = ["-created_at"]

    def __str__(self):
        return self.created_at
