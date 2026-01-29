from django.db import models


class Student(models.Model):
    id = models.AutoField(primary_key=True)
    fullname = models.CharField(max_length=255, verbose_name="Full Name", db_index=True)
    regnumber = models.CharField(max_length=50, unique=True, verbose_name="Registration Number", db_index=True)
    program = models.ForeignKey(
        'programs.Program', on_delete=models.SET_NULL, blank=True,
        null=True, related_name='students', verbose_name="Program")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At", db_index=True)

    class Meta:
        verbose_name = "Student"
        verbose_name_plural = "Students"
        ordering = ['fullname']

    def __str__(self):
        return self.fullname