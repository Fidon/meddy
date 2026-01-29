from django.db import models


class Facilitator(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, verbose_name="Facilitator Name", db_index=True)
    comment = models.TextField(blank=True, null=True, default=None, verbose_name="Comments")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At", db_index=True)

    class Meta:
        verbose_name = "Facilitator"
        verbose_name_plural = "Facilitators"
        ordering = ["name"]

    def __str__(self):
        return self.name
    