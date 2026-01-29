from django.db import models

# questions model
class Question(models.Model):
    id = models.AutoField(primary_key=True)
    content = models.TextField(verbose_name="Question")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At", db_index=True)

    class Meta:
        verbose_name = "Question"
        verbose_name_plural = "Questions"
        ordering = ["-created_at"]

    def __str__(self):
        return self.created_at

# coverpage model
class Page(models.Model):
    id = models.AutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    task = models.CharField(max_length=255, db_index=True)
    groupno = models.DecimalField(max_digits=3, decimal_places=0)
    submitdate = models.CharField(max_length=100, null=True, default=None)
    streams = models.JSONField(null=True, default=None)
    students = models.JSONField(null=True, default=None)
    table = models.BooleanField(default=True)
    program = models.ForeignKey('programs.Program', on_delete=models.SET_NULL, null=True, related_name='pages')
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, related_name='pages')
    question = models.TextField(null=True, blank=True, default=None)
    
    class Meta:
        verbose_name = "Page"
        verbose_name_plural = "Pages"
        ordering = ["-created_at"]

    def __str__(self):
        return self.task