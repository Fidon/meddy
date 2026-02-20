function getCSRFToken() {
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag ? metaTag.getAttribute("content") : "";
}

class CoverPageManager {
  constructor() {
    // State
    this.selectedStreams = new Set();
    this.selectedStudents = new Set();
    this.selectedProgram = 0;
    this.selectedCourse = 0;

    this.selectors = {
      // Containers & Sections
      pagePannel: ".pagepannel",
      studentsList: ".item-list.students",
      programsList: ".item-list.programs",
      coursesList: ".item-list.courses",
      questionsList: ".item-list.questions",
      pagesList: ".item-list.pages",

      // Display elements
      divProgram: "#div_program .txt_content",
      divClass: "#div_class .txt_content",
      divCourse: "#div_course .txt_content",
      divCourseCode: "#div_coursecode .txt_content",
      divFacilitator: "#div_facilitator .txt_content",
      divGroupNumber: "#div_groupnumber .txt_content",
      divSubmissionDate: "#div_submissiondate .txt_content",
      divTask: "#div_task .txt_content",
      divQuestion: "#div_question div",

      // Inputs & Controls
      inputGroupNo: "#input_groupno",
      richEditor: "#richEditor",
      questionEditor: "#questionEditor",
      studentsTable: "#students_table",
      actionsUrl: "#actions_url",
      coverPageUrl: "#cover_page_url",

      // Buttons
      btnSavePage: "#btn_save_page",
      btnSaveQuestion: "#saveQsnBtn",
      btnNewQuestion: "#newQuestionBtn",
      btnClearStudents: "#btn_clear_all_students",
      btnToggleLogo: "#btn_togglelogo",
      btnHideGroupNo: "#btn_hide_groupno",
      btnHideQuestion: "#hideQuestionBtn",

      // Modals & Editors
      richEditorContainer: "#richEditor",
      questionPreview: "#div_question div",
    };

    this.init();
  }

  init() {
    this.initializePaginationManagers();
    this.setupEventListeners();
  }

  // Pagination Setup
  initializePaginationManagers() {
    this.pagination = {
      students: this.createPaginationManager(
        "students",
        this.selectors.studentsList,
        ".custom-section:has(.students) .search-input",
        "#btn_prev_student",
        "#btn_next_student",
        ".custom-section:has(.students) .pagination-info span",
        "students",
        window.initialPaginationData?.students,
        this.renderStudents.bind(this),
      ),
      programs: this.createPaginationManager(
        "programs",
        this.selectors.programsList,
        ".custom-section:has(.programs) .search-input",
        "#btn_prev_prog",
        "#btn_next_prog",
        ".custom-section:has(.programs) .pagination-info span",
        "programs",
        window.initialPaginationData?.programs,
        this.renderPrograms.bind(this),
      ),
      courses: this.createPaginationManager(
        "courses",
        this.selectors.coursesList,
        ".custom-section:has(.courses) .search-input",
        "#btn_prev_course",
        "#btn_next_course",
        ".custom-section:has(.courses) .pagination-info span",
        "courses",
        window.initialPaginationData?.courses,
        this.renderCourses.bind(this),
      ),
      questions: this.createPaginationManager(
        "questions",
        this.selectors.questionsList,
        ".custom-section:has(.questions) .search-input",
        "#btn_prev_qn",
        "#btn_next_qn",
        ".custom-section:has(.questions) .pagination-info span",
        "questions",
        window.initialPaginationData?.questions,
        this.renderQuestions.bind(this),
      ),
      pages: this.createPaginationManager(
        "pages",
        this.selectors.pagesList,
        ".custom-section:has(.pages) .search-input",
        "#btn_prev_page",
        "#btn_next_page",
        ".custom-section:has(.pages) .pagination-info span",
        "pages",
        window.initialPaginationData?.pages,
        this.renderPages.bind(this),
      ),
    };
  }

  createPaginationManager(
    sectionType,
    container,
    searchSel,
    prevBtn,
    nextBtn,
    infoSel,
    label,
    initialData,
    renderFn,
  ) {
    return new PaginationManager({
      sectionType,
      containerSelector: container,
      searchInputSelector: searchSel,
      prevBtnSelector: prevBtn,
      nextBtnSelector: nextBtn,
      paginationInfoSelector: infoSel,
      itemLabel: label,
      initialPagination: initialData,
      renderCallback: renderFn,
    });
  }

  // Rendering Functions for Pagination
  renderStudents(students) {
    const $container = $(this.selectors.studentsList);
    if (!students.length) {
      $container.html(this.createEmptyState("users", "No students found"));
      return;
    }

    let html = "";
    students.forEach((student) => {
      const isSelected = this.selectedStudents.has(student.id);
      html += `
                <div class="item ${isSelected ? "selected" : ""}" 
                     data-id="${student.id}" 
                     data-name="${student.fullname}" 
                     data-regno="${student.regnumber}">
                    <span>${student.fullname} - ${student.regnumber}</span>
                </div>`;
    });
    $container.html(html);
  }

  renderPrograms(programs) {
    const $container = $(this.selectors.programsList);
    if (!programs.length) {
      $container.html(
        this.createEmptyState("graduation-cap", "No programs found"),
      );
      return;
    }

    let html = "";
    programs.forEach((program) => {
      const selected = this.selectedProgram === program.id ? "selected" : "";
      html += `
                <div class="item ${selected}">
                    <span style="display:none" class="progname" data-id="${program.id}">${program.name}</span>
                    <span style="display:none" class="progabbrev">${program.abbrev}</span>
                    <span>${program.abbrev}: ${program.name}</span>
                </div>`;
    });
    $container.html(html);
  }

  renderCourses(courses) {
    const $container = $(this.selectors.coursesList);
    if (!courses.length) {
      $container.html(this.createEmptyState("book", "No courses found"));
      return;
    }

    let html = "";
    courses.forEach((course) => {
      const selected = this.selectedCourse === course.id ? "selected" : "";
      html += `
                <div class="item ${selected}">
                    <span style="display:none" class="coursename">${course.name}</span>
                    <span style="display:none" class="coursecode" data-id="${course.id}">${course.code}</span>
                    <span style="display:none" class="coursefacil">${course.facilitator}</span>
                    <span>${course.code}: ${course.name}</span>
                </div>`;
    });
    $container.html(html);
  }

  renderQuestions(questions) {
    const $container = $(this.selectors.questionsList);
    if (!questions.length) {
      $container.html(
        this.createEmptyState("question-circle", "No questions found"),
      );
      return;
    }

    let html = "";
    questions.forEach((qn) => {
      html += `
                <div class="item">
                    <span>${qn.content}</span>
                    <i class="fas fa-trash item-delete" data-qn="${qn.id}"></i>
                </div>`;
    });
    $container.html(html);
  }

  renderPages(pages) {
    const $container = $(this.selectors.pagesList);
    if (!pages.length) {
      $container.html(
        this.createEmptyState("folder-open", "No saved pages found"),
      );
      return;
    }

    let html = "";
    pages.forEach((pg) => {
      html += `
                <div class="item">
                    <span title="${pg.title}">${pg.title}</span>
                    <i class="fas fa-trash item-delete" data-pg="${pg.id}"></i>
                </div>`;
    });
    $container.html(html);
  }

  createEmptyState(icon, message) {
    return `
            <div class="empty-state">
                <i class="fas fa-${icon}"></i>
                <div>${message}</div>
            </div>`;
  }

  // Event Listeners
  setupEventListeners() {
    const self = this;

    // Pre-populate submission date with current date
    const $date_div = $(self.selectors.divSubmissionDate);
    const $icon = $date_div.find("span").detach();
    const $currentDate = self.formatDisplayDate(new Date());
    $date_div.html($currentDate).append($icon);

    // Section accordion behavior
    $(".pagepannel .section-header").on("click", function () {
      const $header = $(this);
      const $content = $header.next();
      const wasActive = $header.hasClass("active");

      $(".section-header").removeClass("active");
      $(".section-header").next().slideUp(300);

      if (!wasActive) {
        $header.addClass("active");
        $content.slideDown(300);
      }
    });

    // Task type toggle (group / individual)
    $(".pagepannel .tasks button").on("click", function () {
      $(this).parent().find("button").removeClass("active");
      $(this).addClass("active");

      const btnText = $(this).text().toLowerCase();
      self.handleTaskTypeChange(btnText);
    });

    // Item selection (students, programs, courses, questions, pages)
    $(document).on("click", ".item-list .item", function (e) {
      const $target = $(e.target);
      if ($target.closest("i").length) {
        self.deletePageOrQuestion($target);
        return;
      }

      const $item = $(this);
      const $parent = $item.parent();

      if (!$parent.hasClass("students")) {
        $parent.find(".item").removeClass("selected");
        $item.addClass("selected");
      }

      self.handleItemSelection($item, $parent);
    });

    // Students table row remove
    $(this.selectors.studentsTable + " tbody").on(
      "click",
      "tr td span",
      function () {
        const rowId = $(this).closest("tr").attr("id").replace("row", "");
        self.toggleStudentSelection(parseInt(rowId), null, null, true);
      },
    );

    // Clear all selected students
    $(this.selectors.btnClearStudents).on("click", () =>
      this.clearAllStudents(),
    );

    // Group number input
    $(this.selectors.inputGroupNo).on("keyup change", function () {
      const value = parseInt($(this).val()) || 0;
      self.updateGroupNumber(value);
    });

    // Toggle sections visibility
    $(this.selectors.btnHideGroupNo + ", " + this.selectors.btnHideQuestion).on(
      "click",
      function () {
        self.toggleSectionVisibility($(this));
      },
    );

    // Toggle subdate and signature visibility
    $(".subdate button, .signatures button").on("click", function () {
      self.toggleSubdateAndSignatures($(this));
    });

    // Toggle logo
    $(this.selectors.btnToggleLogo).on("click", () => this.toggleLogo());

    // New question editor
    $(this.selectors.btnNewQuestion).on("click", () =>
      this.showQuestionEditor(),
    );

    // Rich text formatting buttons
    $("#questionEditor .editor-btn").on("click", function () {
      self.applyTextFormat($(this).data("value"));
    });

    // Question preview live update
    $(this.selectors.richEditor).on("input", () =>
      this.updateQuestionPreview(),
    );

    // Prevent rich editor paste styling
    $(this.selectors.richEditor).on("paste", function (e) {
      e.preventDefault();
      const text = (e.originalEvent || e).clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    });

    // Save question
    $(this.selectors.btnSaveQuestion).on("click", () => this.saveQuestion());

    // Save entire page
    $(this.selectors.btnSavePage).on("click", () => this.savePage());

    // Editable fields click → modal
    $(".body div.txt_content span").on("click", function () {
      self.openEditModal($(this));
    });

    // Modal save on button click
    $(".modal .btn-success").on("click", function () {
      const $modal = $(this).closest(".modal");
      self.saveModalChanges($modal);
    });

    // Modal save on form submit
    $(".modal form").on("submit", function (e) {
      e.preventDefault();
      const $modal = $(this).closest(".modal");
      self.saveModalChanges($modal);
    });

    // Modal save on press of Enter key
    $(".modal .form-control").on("keypress", function (e) {
      if (e.which === 13 && !e.shiftKey) {
        e.preventDefault();
        const $modal = $(this).closest(".modal");
        self.saveModalChanges($modal);
      }
    });

    // Stream pills
    $(".pagepannel .stream-pill").on("click", function () {
      self.toggleStream($(this));
    });
  }

  // Business Logic Methods
  handleTaskTypeChange(type) {
    const $taskDiv = $(this.selectors.divTask).parent();
    if (type === "hide") {
      $taskDiv.slideUp(300);
      return;
    }

    $taskDiv.slideDown(300);
    this.clearAllStudents();

    const isGroup = type === "group";
    const text = isGroup ? "GROUP ASSIGNMENT" : "INDIVIDUAL ASSIGNMENT";

    const $icon = $(this.selectors.divTask).find("span").detach();
    $(this.selectors.divTask).text(text).append($icon);

    if (isGroup) {
      $(".body div.individual_assignment").slideUp(300);
      $(".table_div").slideDown(300);
      $(this.selectors.divGroupNumber).parent().slideDown(300);
    } else {
      $(".table_div").slideUp(300);
      $(".body div.individual_assignment").slideDown(300);
      $(this.selectors.divGroupNumber).parent().slideUp(300);
    }
  }

  toggleStudentSelection(
    id,
    fullname,
    regno,
    forceRemove = false,
    updateTable = true,
  ) {
    const tableVisible = $(".table_div").is(":visible");

    if (tableVisible && updateTable) {
      const $item = $(`.pagepannel .students .item[data-id="${id}"]`);
      const isSelected = this.selectedStudents.has(id);
      const shouldRemove = forceRemove || isSelected;

      if (shouldRemove) {
        this.selectedStudents.delete(id);
        $item.removeClass("selected");
        this.removeStudentRow("row" + id);
      } else {
        this.selectedStudents.add(id);
        $item.addClass("selected");
        this.appendStudentRow(id, fullname, regno);
      }
    } else {
      // Individual mode
      $("#ind_studentname .txt_content").text(fullname);
      $("#ind_studentregno .txt_content").text(regno);

      const $item = $(`.pagepannel .students .item[data-id="${id}"]`);
      $item.parent().find(".item").removeClass("selected");
      $item.addClass("selected");

      this.selectedStudents.clear();
      this.selectedStudents.add(id);
    }
  }

  appendStudentRow(id, fullname, regno) {
    const $tbody = $(this.selectors.studentsTable + " tbody");
    $tbody.find(".empty-tr").remove();

    const rowCount = $tbody.find("tr").length;
    const row = `
            <tr id="row${id}">
                <td>${rowCount + 1}</td>
                <td>${fullname}</td>
                <td>${regno} <span><i class="fas fa-times"></i></span></td>
                <td></td>
            </tr>`;

    $tbody.append(row);
  }

  removeStudentRow(rowId) {
    $("#" + rowId).remove();

    const $rows = $(this.selectors.studentsTable + " tbody tr");
    if ($rows.length === 0) {
      $(this.selectors.studentsTable + " tbody").html(`
                <tr class="empty-tr">
                    <td colspan="4">No students selected</td>
                </tr>`);
    } else {
      $rows.each((idx, row) => {
        $(row)
          .find("td:first-child")
          .text(idx + 1);
      });
    }
  }

  clearAllStudents() {
    this.selectedStudents.clear();
    $(".pagepannel .students .item").removeClass("selected");
    $(this.selectors.studentsTable + " tbody").html(`
            <tr class="empty-tr">
                <td colspan="4">No students selected</td>
            </tr>`);

    $("#ind_studentname .txt_content").text("N/A");
    $("#ind_studentregno .txt_content").text("N/A");
  }

  updateProgram(name, abbrev) {
    const $iconProgram = $(this.selectors.divProgram).find("span").detach();
    $(this.selectors.divProgram).text(name).append($iconProgram);

    const streamsText = this.formatStreamSet(this.selectedStreams);
    const display = abbrev + (streamsText ? "   " + streamsText : "");

    const $iconClass = $(this.selectors.divClass).find("span").detach();
    $(this.selectors.divClass).text(display).append($iconClass);

    $(this.selectors.divClass).attr("data-classname", abbrev);
  }

  updateCourse(name, code, facilitator) {
    const $iconCourse = $(this.selectors.divCourse).find("span").detach();
    $(this.selectors.divCourse).text(name).append($iconCourse);

    const $iconCode = $(this.selectors.divCourseCode).find("span").detach();
    $(this.selectors.divCourseCode).text(code).append($iconCode);

    const $iconFacil = $(this.selectors.divFacilitator).find("span").detach();
    $(this.selectors.divFacilitator)
      .text(facilitator || "N/A")
      .append($iconFacil);
  }

  updateGroupNumber(value) {
    const text = value || "0";
    const $icon = $(this.selectors.divGroupNumber).find("span").detach();
    $(this.selectors.divGroupNumber).text(text).append($icon);
    $(this.selectors.inputGroupNo).val(text);
  }

  toggleSectionVisibility($btn) {
    const isGroupNo = $btn.is(this.selectors.btnHideGroupNo);
    const $target = isGroupNo
      ? $(this.selectors.divGroupNumber).parent()
      : $(this.selectors.divQuestion).parent();
    const $icon = $btn.find("i");

    $target.slideToggle(300, () => {
      const visible = $target.is(":visible");
      $icon.toggleClass("fas fa-eye-slash", !visible);
      $btn.contents().last()[0].textContent = visible
        ? " Hide Section"
        : " Show Section";
    });
  }

  toggleSubdateAndSignatures($btn) {
    const $parentSection = $btn.parent();
    const isHide = $btn.text().toLowerCase().trim() === "hide";

    // Update active button state
    $parentSection.find("button").removeClass("active");
    $btn.addClass("active");

    // ── Submission Date section ──
    if ($parentSection.hasClass("subdate")) {
      const $target = $("#div_submissiondate");
      isHide ? $target.slideUp(300) : $target.slideDown(300);
      return;
    }

    // ── Signatures section ──
    const isIndividualVisible = $(".body div.individual_assignment").is(
      ":visible",
    );

    if (isIndividualVisible) {
      const $signature = $("#ind_studentsign");
      isHide ? $signature.slideUp(300) : $signature.slideDown(300);
    } else {
      const $table = $("#students_table");
      const $headerRow = $table.find("thead tr");
      const $bodyRows = $table.find("tbody tr");

      if (isHide) {
        $headerRow.find("th:nth-child(4)").remove();
        $bodyRows.find("td:nth-child(4)").remove();
      } else {
        if ($headerRow.find("th:nth-child(4)").length === 0) {
          $headerRow.append("<th>Signature</th>");
        }

        $bodyRows.each(function () {
          const $row = $(this);
          if ($row.find("td:nth-child(4)").length === 0) {
            $row.append("<td></td>");
          }
        });
      }
    }
  }

  toggleLogo() {
    const states = ["two_logo", "one_logo", "nologo"];
    const current = $("#header_twologo").is(":visible")
      ? "two_logo"
      : $("#header_onelogo").is(":visible")
        ? "one_logo"
        : "nologo";

    const next = states[(states.indexOf(current) + 1) % 3];

    $("#header_twologo, #header_onelogo, #header_nologo").hide();

    const idMap = {
      two_logo: "header_twologo",
      one_logo: "header_onelogo",
      nologo: "header_nologo",
    };

    $(`#${idMap[next]}`).show();
  }

  showQuestionEditor() {
    $(this.selectors.richEditor).html("");
    this.updateQuestionPreview();

    $(this.selectors.questionEditor).show();
    $(this.selectors.richEditor).focus();
    if (!$(this.selectors.divQuestion).parent().is(":visible")) {
      $(this.selectors.btnHideQuestion).click();
    }
  }

  applyTextFormat(format) {
    if (format === "b") document.execCommand("bold");
    else if (format === "i".trim()) document.execCommand("italic");
    else if (format === "u") document.execCommand("underline");

    $(this.selectors.richEditor).focus();
    this.updateQuestionPreview();
  }

  updateQuestionPreview() {
    $(this.selectors.questionPreview).html($(this.selectors.richEditor).html());
  }

  toggleStream($pill) {
    const stream = $pill.text();
    if (this.selectedStreams.has(stream)) {
      this.selectedStreams.delete(stream);
      $pill.removeClass("active");
    } else {
      this.selectedStreams.add(stream);
      $pill.addClass("active");
    }

    const className = $(this.selectors.divClass).attr("data-classname") || "";
    const streamsText = this.formatStreamSet(this.selectedStreams);
    const display = className + (streamsText ? "   " + streamsText : "");

    const $icon = $(this.selectors.divClass).find("span").detach();
    $(this.selectors.divClass).text(display).append($icon);
  }

  formatStreamSet(streams) {
    const arr = [...streams];
    if (arr.length === 0) return "";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} & ${arr[1]}`;
    return `${arr.slice(0, -1).join(", ")} & ${arr[arr.length - 1]}`;
  }

  handleItemSelection($item, $parent) {
    if ($parent.hasClass("students")) {
      const id = parseInt($item.data("id"));
      const name = $item.data("name");
      const regno = $item.data("regno");
      this.toggleStudentSelection(id, name, regno);
    } else if ($parent.hasClass("programs")) {
      const name = $item.find(".progname").text();
      const abbrev = $item.find(".progabbrev").text();
      this.selectedProgram = parseInt($item.find(".progname").data("id"));
      this.updateProgram(name, abbrev);
      this.selectedStreams.clear();
      $(".pagepannel .stream-pill").removeClass("active");
    } else if ($parent.hasClass("courses")) {
      const name = $item.find(".coursename").text();
      const code = $item.find(".coursecode").text();
      let facil = $item.find(".coursefacil").text();
      facil = facil === "None" ? "N/A" : facil;
      this.selectedCourse = parseInt($item.find(".coursecode").data("id"));
      this.updateCourse(name, code, facil);
    } else if ($parent.hasClass("questions")) {
      $(this.selectors.richEditor).html($item.find("span").html());
      this.updateQuestionPreview();
    } else if ($parent.hasClass("pages")) {
      const pageId = parseInt($item.find("i").data("pg"));
      this.loadSavedPage(pageId);
    }
  }

  deletePageOrQuestion($deleteIcon) {
    const parentId = $deleteIcon.closest(".item-list").attr("id");
    const isQuestion = parentId === "questionsList";
    const action = isQuestion ? "question_delete" : "page_delete";
    const id = parseInt(
      isQuestion ? $deleteIcon.data("qn") : $deleteIcon.data("pg"),
    );

    const originalClass = $deleteIcon.attr("class");
    $deleteIcon.attr("class", "fas fa-spinner fa-pulse item-delete");

    const formData = new FormData();
    formData.append(action, id);

    $.ajax({
      type: "POST",
      url: $(this.selectors.actionsUrl).val(),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": getCSRFToken() },
      success: (response) => {
        if (response.success) {
          $deleteIcon.closest(".item").remove();
          isQuestion
            ? this.pagination.questions.loadPage(1)
            : this.pagination.pages.loadPage(1);
        } else {
          $deleteIcon.attr("class", originalClass);
        }
        alert(response.sms);
      },
      error: () => {
        $deleteIcon.attr("class", originalClass);
        alert("Error deleting item");
      },
    });
  }

  saveQuestion() {
    const $btn = $(this.selectors.btnSaveQuestion);
    const originalText = $btn.html();

    const formData = new FormData();
    formData.append("question", $.trim($(this.selectors.richEditor).html()));

    $btn.html("<i class='fas fa-spinner fa-pulse'></i>");

    $.ajax({
      type: "POST",
      url: $(this.selectors.actionsUrl).val(),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": getCSRFToken() },
      success: (response) => {
        $btn.html(originalText);
        const status = response.success ? "success" : "danger";
        const msg = `<span class='text-${status}'>${response.sms}</span>`;
        $("#qs_status_div").html(msg).removeClass("d-none").addClass("d-block");
        setTimeout(
          () => $("#qs_status_div").addClass("d-none").removeClass("d-block"),
          5000,
        );
        this.pagination.questions.loadPage(1);
      },
      error: () => {
        $btn.html(originalText);
        alert("Error saving question");
      },
    });
  }

  savePage() {
    const $btn = $(this.selectors.btnSavePage);
    const originalText = $btn.html();

    const task = $(this.selectors.divTask)
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
    const grpno =
      parseInt(
        $(this.selectors.divGroupNumber)
          .clone()
          .children()
          .remove()
          .end()
          .text()
          .trim(),
      ) || 0;
    const subdate = $(this.selectors.divSubmissionDate)
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
    const course = $(this.selectors.divCourseCode)
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
    const prog = $(this.selectors.divClass).attr("data-classname") || "";
    const title =
      prog +
      ": " +
      $(this.selectors.divCourse)
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim() +
      " - " +
      $(this.selectors.divFacilitator)
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim();

    const formData = new FormData();
    formData.append("task", task);
    formData.append("grpno", grpno);
    formData.append("subdate", subdate);
    formData.append("title", title);
    formData.append("streams", [...this.selectedStreams]);
    formData.append("students", [...this.selectedStudents]);
    formData.append("prog", prog);
    formData.append("course", course);
    formData.append("table", $(".table_div").is(":visible"));
    formData.append("save_page", "save_page");
    formData.append(
      "question",
      $(this.selectors.questionPreview).html().trim(),
    );

    $btn.html("<i class='fas fa-spinner fa-pulse'></i>");

    $.ajax({
      type: "POST",
      url: $(this.selectors.actionsUrl).val(),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": getCSRFToken() },
      success: (response) => {
        $btn.html(originalText);
        this.pagination.pages.loadPage(1);
        alert(response.sms);
      },
      error: () => {
        $btn.html(originalText);
        alert("Error saving page");
      },
    });
  }

  loadSavedPage(pageId) {
    const formData = new FormData();
    formData.append("page_info", pageId);

    $.ajax({
      type: "POST",
      url: $(this.selectors.actionsUrl).val(),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": getCSRFToken() },
      success: (response) => {
        const pg = response;
        this.clearAllStudents();
        this.selectedStreams.clear();

        $(".pagepannel .stream-pill").removeClass("active");
        pg.streams.forEach((stream) => {
          this.selectedStreams.add(stream);
          $(`#pillsList span[data-strm="${stream}"]`).addClass("active");
        });

        this.handleTaskTypeChange(
          pg.task.toLowerCase().includes("group") ? "group" : "individual",
        );
        this.updateProgram(pg.prog, pg.class);
        this.updateCourse(pg.course, pg.code, pg.facil);
        this.updateGroupNumber(pg.grpno);

        const formattedDate = this.formatDisplayDate(pg.subdate);
        const $icon = $(this.selectors.divSubmissionDate).find("span").detach();
        $(this.selectors.divSubmissionDate).html(formattedDate).append($icon);

        $(this.selectors.richEditor).html(pg.qn);
        this.updateQuestionPreview();

        pg.students.forEach((student) => {
          this.toggleStudentSelection(
            student.id,
            student.fullname,
            student.regnumber,
            false,
            pg.table,
          );
        });

        this.selectedProgram = parseInt(pg.progId);
        this.selectedCourse = parseInt(pg.courseId);

        this.pagination.programs.loadPage(1);
        this.pagination.courses.loadPage(1);
      },
      error: () => alert("Failed to load saved page"),
    });
  }

  openEditModal($span) {
    const modalTarget = $span.data("bs-target");
    let text = $span.parent().clone().children().remove().end().text().trim();

    if (modalTarget === "#edit_class_modal") {
      text = $span.parent().attr("data-classname");
    }

    const $modal = $(modalTarget);
    const $input = $modal.find(".form-control");

    if (modalTarget === "#edit_submissiondate_modal") {
      const date = new Date(text);
      const yyyyMmDd =
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0");
      $input.val(yyyyMmDd);
    } else {
      $input.val(text);
    }

    $modal.modal("show");
    $modal.one("shown.bs.modal", () => $input.focus());
  }

  saveModalChanges($modal) {
    const $input = $modal.find(".form-control");
    let value = $input.val().trim();
    const target = $input.attr("name");

    if (target === "div_groupnumber") {
      value = parseInt(value) || 0;
      this.updateGroupNumber(value);
    } else if (target === "div_submissiondate") {
      value = this.formatDisplayDate(value);
    } else if (target === "div_class") {
      $(this.selectors.divClass).attr("data-classname", value);
      value += "   " + this.formatStreamSet(this.selectedStreams);
    }

    const $actualDiv = $("#" + target + " .txt_content");
    const $icon = $actualDiv.find("span").detach();
    $actualDiv.html(value).append($icon);

    $modal.modal("hide");
  }

  formatDisplayDate(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const suffix = this.getOrdinalSuffix(day);
    const month = date.toLocaleString("en-US", { month: "long" });
    const year = date.getFullYear();
    return `${day}<sup>${suffix}</sup> ${month}, ${year}`;
  }

  getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }
}

class PaginationManager {
  constructor(config) {
    this.sectionType = config.sectionType;
    this.containerSelector = config.containerSelector;
    this.searchInputSelector = config.searchInputSelector;
    this.prevBtnSelector = config.prevBtnSelector;
    this.nextBtnSelector = config.nextBtnSelector;
    this.paginationInfoSelector = config.paginationInfoSelector;
    this.renderCallback = config.renderCallback;
    this.itemLabel = config.itemLabel || "items";
    this.initialPagination = config.initialPagination;

    // default values
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalCount = 0;
    this.searchQuery = "";
    this.perPage = 10;

    // Initialize state from template data if provided
    if (this.initialPagination) {
      this.updatePaginationState(this.initialPagination);
    }

    this.init();
  }

  init() {
    const self = this;

    // event listeners
    $(document).on("click", this.prevBtnSelector, function (e) {
      e.preventDefault();
      if (self.currentPage > 1) {
        self.loadPage(self.currentPage - 1);
      }
    });

    $(document).on("click", this.nextBtnSelector, function (e) {
      e.preventDefault();
      if (self.currentPage < self.totalPages) {
        self.loadPage(self.currentPage + 1);
      }
    });

    // Search with debounce
    $(document).on(
      "input",
      this.searchInputSelector,
      this.debounce(function () {
        self.searchQuery = $(self.searchInputSelector).val().trim();
        self.currentPage = 1;
        self.loadPage(1);
      }, 300),
    );
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  loadPage(page) {
    const formData = new FormData();
    formData.append("action", "paginate");
    formData.append("section_type", this.sectionType);
    formData.append("page", page);
    formData.append("search", this.searchQuery);
    formData.append("per_page", this.perPage);

    const actionsUrl = $("#cover_page_url").val();

    if (!actionsUrl) {
      alert("Configuration error: Invalid url.");
      return;
    }

    $.ajax({
      type: "POST",
      url: actionsUrl,
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": getCSRFToken() },
      beforeSend: () => {
        $(this.containerSelector).css("opacity", "0.5");
        $(this.prevBtnSelector + ", " + this.nextBtnSelector).prop(
          "disabled",
          true,
        );
      },
      success: (response) => {
        if (response.success) {
          this.renderCallback(response.items);
          this.updatePaginationState(response.pagination);
        } else {
          alert(`Error: ${response.sms || "Unknown server error"}`);
        }
      },
      error: (xhr, status, error) => {
        if (status === "timeout") {
          alert("Request timed out.");
        } else if (xhr.status === 0) {
          alert("No internet connection.");
        } else {
          alert(`Server error (${xhr.status}).`);
        }
      },
      complete: () => {
        $(this.containerSelector).css("opacity", "1");
      },
    });
  }

  updatePaginationState(pagination) {
    this.currentPage = pagination.current_page;
    this.totalPages = pagination.total_pages;
    this.totalCount = pagination.total_count;

    // Update info text
    const infoText =
      pagination.total_count === 0
        ? `No ${this.itemLabel} found`
        : `Showing ${pagination.start_index} to ${pagination.end_index} of ${pagination.total_count}`;

    $(this.paginationInfoSelector).text(infoText);

    // Update button states
    $(this.prevBtnSelector)
      .prop("disabled", !pagination.has_previous)
      .toggleClass("disabled", !pagination.has_previous);

    $(this.nextBtnSelector)
      .prop("disabled", !pagination.has_next)
      .toggleClass("disabled", !pagination.has_next);
  }
}

$(document).ready(function () {
  new CoverPageManager();
});
