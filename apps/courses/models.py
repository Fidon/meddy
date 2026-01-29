from django.db import models

# course model
class Course(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, db_index=True, verbose_name="Course Name")
    code = models.CharField(max_length=50, unique=True, verbose_name="Code")
    facilitator = models.ForeignKey('facilitators.Facilitator', on_delete=models.SET_NULL, blank=True,
        null=True, default=None, verbose_name="Facilitator")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True, verbose_name="Created At")
    
    class Meta:
        verbose_name = "Course"
        verbose_name_plural = "Courses"
        ordering = ['-created_at']

    def __str__(self):
        return self.name