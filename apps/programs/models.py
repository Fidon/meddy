from django.db import models


class Program(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, verbose_name="Program Name", db_index=True)
    abbrev = models.CharField(max_length=50, unique=True, verbose_name="Abbreviation", db_index=True)
    comment = models.TextField(blank=True, null=True, default=None, verbose_name="Comments")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At", db_index=True)

    class Meta:
        verbose_name = "Program"
        verbose_name_plural = "Programs"
        ordering = ["name"]

    def __str__(self):
        return self.name