class StudentsManager {
  constructor() {
    this.config = {
      columnIndices: [0, 1, 2, 3, 4, 5],
      dateCache: { start: null, end: null },
      csrfToken: this.getCSRFToken(),
    };

    this.allow_bulk_delete = true;

    this.selectors = {
      newStudentForm: "#new_student_form",
      excelStudentForm: "#excel_students_form",
      programChangeForm: "#change_program_form",
      editStudentForm: "#edit_student_form",
      deleteStudentForm: "#del_student_form",
      studentsTable: "#students_table",
      updateStudentCanvas: "#edit_student_canvas",
      changeProgramCanvas: "#change_program_canvas",
      newStudentCanvas: "#new_student_canvas",
      deleteStudentModal: "#delete_student_modal",
      searchField: "#search_student_field",
      studentsPageUrl: "#students_page_url",
      deleteMultipleModal: "#delete_all_student",

      // Form fields
      studentNames: "#student_fullname",
      studentCode: "#student_regnumber",
      studentProgram: "#student_program",
      studentEditNames: "#student_edit_fullname",
      studentEditCode: "#student_edit_regnumber",
      studentEditProgram: "#student_edit_program",
      studentId: "#edit_student_id",
      studentDelId: "#student_del_id",
      changeProgStart: "#change_program_start",
      changeProgEnd: "#change_program_end",

      excelFile: "#students_excel_file",
      modeToggle: 'input[name="entry_mode"]',
      singleContainer: "#single_entry_container",
      multiContainer: "#multi_entry_container",

      // Buttons
      newStudentBtn: "#new_student_btn",
      excelStudentBtn: "#excel_students_btn",
      filterClearBtn: "#students_filter_clear",
      studentEditBtn: "#student_edit_btn",
      studentDeleteBtn: "#student_delete_btn",
      selectAllCheckbox: "#select-all",
      deleteSelectedBtn: "#delete_selected_btn",
      confirmMultipleDelete: "#btn_confirm_multiple_delete",
      programChangeBtn: "#program_change_btn",
    };

    this.table = null;
    this.programOptions = null;
    this.init();
  }

  /**
   * Get CSRF token from meta tag
   */
  getCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute("content") : "";
  }

  /**
   * Initialize the application
   */
  init() {
    this.programOptions = $(`${this.selectors.studentProgram} option`);
    this.setupTable();
    this.setupEventHandlers();
    this.initializeSearchableSelects();
  }

  /**
   * Initialize searchable selects
   */
  initializeSearchableSelects() {
    const offcanvasConfigs = [
      {
        offcanvas: this.selectors.newStudentCanvas,
        select: this.selectors.studentProgram,
        options: {
          placeholder: "Search program...",
          allowClear: true,
          noResultsText: "No program found",
        },
      },
      {
        offcanvas: this.selectors.updateStudentCanvas,
        select: this.selectors.studentEditProgram,
        options: {
          placeholder: "Search program...",
          allowClear: true,
          noResultsText: "No program found",
        },
      },
      {
        offcanvas: this.selectors.changeProgramCanvas,
        select: this.selectors.changeProgStart,
        options: {
          placeholder: "Search program...",
          allowClear: true,
          noResultsText: "No program found",
        },
      },
      {
        offcanvas: this.selectors.changeProgramCanvas,
        select: this.selectors.changeProgEnd,
        options: {
          placeholder: "Search program...",
          allowClear: true,
          noResultsText: "No program found",
        },
      },
    ];

    offcanvasConfigs.forEach(({ offcanvas, select, options }) => {
      const offcanvasElement = document.querySelector(offcanvas);

      if (offcanvasElement) {
        offcanvasElement.addEventListener("shown.bs.offcanvas", () => {
          const $select = $(select);

          if (!$select.data("searchableSelect")) {
            $select.searchableSelect(options);
          }
        });
      }
    });
  }

  /**
   * Fill edit form with data
   */
  fillEditForm(rowIndex, id, action) {
    if (action === "edit") {
      const row = $(
        `${this.selectors.studentsTable} tbody tr:nth-child(${rowIndex + 1})`,
      );
      const fullname = $("td:nth-child(3)", row).text();
      const regnumber = $("td:nth-child(4)", row).text();

      const programClassName = $("td:nth-child(5)", row).attr("class");
      if (programClassName && programClassName.includes("prog_")) {
        const programId = programClassName.split("prog_")[1];
        if (programId) {
          $(this.selectors.studentEditProgram).val(programId).trigger("change");
        } else {
          $(this.selectors.studentEditProgram).val(null).trigger("change");
        }
      }

      $(this.selectors.studentEditNames).val(fullname);
      $(this.selectors.studentEditCode).val(regnumber);
      $(this.selectors.studentId).val(id);
      $(this.selectors.updateStudentCanvas).offcanvas("show");
    } else {
      $(this.selectors.studentDelId).val(id);
      $(this.selectors.deleteStudentModal).modal("show");
    }
  }

  /**
   * Generate alert messages
   */
  generateAlert(isSuccess, message) {
    const alertType = isSuccess ? "success" : "danger";
    const iconType = isSuccess ? "check" : "exclamation";

    return `
      <div class="alert alert-${alertType} alert-dismissible fade show px-2 m-0 d-block w-100">
        <i class='fas fa-${iconType}-circle'></i> ${message}
        <button type="button" class="btn-close d-inline-block" data-bs-dismiss="alert"></button>
      </div>
    `;
  }

  /** Display alert messages */
  displayAlert(formSms, isSuccess, message) {
    const feedback = this.generateAlert(isSuccess, message);
    formSms.html(feedback);

    if (isSuccess) {
      setTimeout(() => {
        formSms.fadeOut(300, () => {
          formSms.html("").show();
        });
      }, 1000);
    }
  }

  /**
   * Setup all event handlers
   */
  setupEventHandlers() {
    this.setupNewStudentForm();
    this.setupExcelStudentForm();
    this.setupEditStudentForm();
    this.setupProgramChangeForm();
    this.setupDeleteStudentForm();
    this.setupSearchAndFilters();
    this.setupBulkDelete();

    // Toggle between Single and Multi students form
    $(this.selectors.modeToggle).change((e) => {
      if (e.target.id === "mode_single") {
        $(this.selectors.singleContainer).removeClass("d-none");
        $(this.selectors.multiContainer).addClass("d-none");
      } else {
        $(this.selectors.singleContainer).addClass("d-none");
        $(this.selectors.multiContainer).removeClass("d-none");
      }
    });

    // Make fillEditForm globally accessible
    window.fill_edit_form = (rowIndex, id, str) => {
      this.fillEditForm(rowIndex, id, str);
    };
  }

  /**
   * Setup new student form
   */
  setupNewStudentForm() {
    $(this.selectors.newStudentForm).submit((e) => {
      e.preventDefault();
      const form = $(this.selectors.newStudentForm);
      const submitBtn = $(this.selectors.newStudentBtn);
      const formSms = $(`${this.selectors.newStudentForm} .formsms`);

      this.handleNewStudentSubmit(form, submitBtn, formSms);
    });
  }

  /**
   * Handle new student form submission
   */
  handleNewStudentSubmit(form, submitBtn, formSms) {
    const formData = new FormData();
    formData.append("fullname", $(this.selectors.studentNames).val()).trim();
    formData.append("regnumber", $(this.selectors.studentCode).val()).trim();
    formData.append("program", $(this.selectors.studentProgram).val());

    $.ajax({
      type: "POST",
      url: form.attr("action"),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": this.config.csrfToken },
      beforeSend: () => {
        submitBtn
          .html("<i class='fas fa-spinner fa-pulse'></i>")
          .attr("type", "button");
      },
      success: (response) => {
        submitBtn.html("Add").attr("type", "submit");

        this.displayAlert(formSms, response.success, response.sms);

        if (response.success) {
          $(this.selectors.newStudentForm)[0].reset();
          $(this.selectors.studentProgram).val(null).trigger("change");
          this.table.draw();
        }
      },
      error: (xhr, status, error) => {
        submitBtn.html("Add").attr("type", "submit");
        let message = "Server error.";

        if (status === "timeout") {
          message = "Request timed out.";
        } else if (xhr.status === 0) {
          message = "No internet connection.";
        } else {
          console.log("Server error:", xhr.status);
        }

        this.displayAlert(formSms, false, message);
      },
    });
  }

  /**
   * Setup excel upload form
   */
  setupExcelStudentForm() {
    $(this.selectors.excelStudentForm).submit((e) => {
      e.preventDefault();
      const form = $(this.selectors.excelStudentForm);
      const submitBtn = $(this.selectors.excelStudentBtn);
      const formSms = $(`${this.selectors.excelStudentForm} .formsms`);

      this.handleExcelSubmit(form, submitBtn, formSms);
    });
  }

  /**
   * Handle Excel file AJAX submission
   */
  handleExcelSubmit(form, submitBtn, formSms) {
    const fileInput = $(this.selectors.excelFile)[0];
    const formData = new FormData();
    formData.append("excel_file", fileInput.files[0]);

    $.ajax({
      type: "POST",
      url: form.attr("action"),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": this.config.csrfToken },
      beforeSend: () => {
        submitBtn
          .html("<i class='fas fa-spinner fa-pulse'></i>")
          .attr("type", "button");
      },
      success: (response) => {
        submitBtn.html("Upload").attr("type", "submit");
        this.displayAlert(formSms, response.success, response.sms);
        form[0].reset();
        this.table.draw();
      },
      error: () => {
        submitBtn.html("Upload").attr("type", "submit");
        this.displayAlert(formSms, false, "Server error during upload.");
      },
    });
  }

  /**
   * Setup edit student form
   */
  setupEditStudentForm() {
    $(this.selectors.editStudentForm).submit((e) => {
      e.preventDefault();
      const formSms = $(`${this.selectors.editStudentForm} .formsms`);
      const submitBtn = $(this.selectors.studentEditBtn);

      this.handleEditStudentSubmit(submitBtn, formSms);
    });
  }

  /**
   * Handle edit student form submission
   */
  handleEditStudentSubmit(submitBtn, formSms) {
    const form = $(this.selectors.editStudentForm);
    const formData = new FormData();
    formData.append("student_id", $(this.selectors.studentId).val());
    formData.append(
      "fullname",
      $(this.selectors.studentEditNames).val().trim(),
    );
    formData.append(
      "regnumber",
      $(this.selectors.studentEditCode).val().trim(),
    );
    formData.append("program", $(this.selectors.studentEditProgram).val());

    $.ajax({
      type: "POST",
      url: form.attr("action"),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": this.config.csrfToken },
      beforeSend: () => {
        submitBtn
          .html("<i class='fas fa-spinner fa-pulse'></i>")
          .attr("type", "button");
      },
      success: (response) => {
        submitBtn.html("Update").attr("type", "submit");
        this.displayAlert(formSms, response.success, response.sms);
        if (response.success) this.table.draw();
      },
      error: (xhr, status, error) => {
        submitBtn.html("Update").attr("type", "submit");
        let message = "Server error.";

        if (status === "timeout") {
          message = "Request timed out.";
        } else if (xhr.status === 0) {
          message = "No internet connection.";
        } else {
          console.log("Server error:", xhr.status);
        }

        this.displayAlert(formSms, false, message);
      },
    });
  }

  /**
   * Setup program transfer form
   */
  setupProgramChangeForm() {
    $(this.selectors.programChangeForm).submit((e) => {
      e.preventDefault();
      const formSms = $(`${this.selectors.programChangeForm} .formsms`);
      const submitBtn = $(this.selectors.programChangeBtn);

      this.handleProgramChangeSubmit(submitBtn, formSms);
    });
  }

  /**
   * Handle program transfer form submission
   */
  handleProgramChangeSubmit(submitBtn, formSms) {
    const progStart = $(this.selectors.changeProgStart).val();
    const progEnd = $(this.selectors.changeProgEnd).val();

    if (progStart == "" || progEnd == "") {
      this.displayAlert(
        formSms,
        false,
        "Please select programs in both fields.",
      );
      return;
    }

    if (parseInt(progStart) === parseInt(progEnd)) {
      this.displayAlert(
        formSms,
        false,
        "Please select two different programs.",
      );
      return;
    }

    const form = $(this.selectors.editStudentForm);
    const formData = new FormData();
    formData.append("prog_change_start", parseInt(progStart));
    formData.append("prog_change_end", parseInt(progEnd));

    $.ajax({
      type: "POST",
      url: form.attr("action"),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": this.config.csrfToken },
      beforeSend: () => {
        submitBtn
          .html("<i class='fas fa-spinner fa-pulse'></i>")
          .attr("type", "button");
      },
      success: (response) => {
        submitBtn.html("Transfer").attr("type", "submit");
        $(this.selectors.programChangeForm)[0].reset();
        this.displayAlert(formSms, response.success, response.sms);
        if (response.success) this.table.draw();
      },
      error: (xhr, status, error) => {
        submitBtn.html("Transfer").attr("type", "submit");
        let message = "Server error.";

        if (status === "timeout") {
          message = "Request timed out.";
        } else if (xhr.status === 0) {
          message = "No internet connection.";
        } else {
          console.log("Server error:", xhr.status);
        }

        this.displayAlert(formSms, false, message);
      },
    });
  }

  /**
   * Setup delete student form
   */
  setupDeleteStudentForm() {
    $(this.selectors.deleteStudentForm).submit((e) => {
      e.preventDefault();
      const delStudentId = $(this.selectors.studentDelId).val();

      if (parseInt(delStudentId) > 0) {
        const submitBtn = $(this.selectors.studentDeleteBtn);
        const formSms = $(`${this.selectors.deleteStudentForm} .formsms`);
        this.handleDeleteStudentSubmit(submitBtn, formSms, delStudentId);
      }
    });
  }

  /**
   * Handle delete student form submission
   */
  handleDeleteStudentSubmit(submitBtn, formSms, delStudentId) {
    const form = $(this.selectors.deleteStudentForm);
    const formData = new FormData();
    formData.append("delete_id", delStudentId);

    $.ajax({
      type: "POST",
      url: form.attr("action"),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": this.config.csrfToken },
      beforeSend: () => {
        submitBtn
          .html("<i class='fas fa-spinner fa-pulse'></i>")
          .attr("type", "button");
      },
      success: (response) => {
        submitBtn.html("Yes").attr("type", "submit");

        this.displayAlert(formSms, response.success, response.sms);

        if (response.success) {
          $(this.selectors.studentDelId).val("");
          this.table.draw();
        }
      },
      error: (xhr, status, error) => {
        submitBtn.html("Yes").attr("type", "submit");
        let message = "Server error.";

        if (status === "timeout") {
          message = "Request timed out.";
        } else if (xhr.status === 0) {
          message = "No internet connection.";
        } else {
          console.log("Server error:", xhr.status);
        }

        this.displayAlert(formSms, false, message);
      },
    });
  }

  /**
   * Setup search and filter handlers
   */
  setupSearchAndFilters() {
    // Global search
    $(this.selectors.searchField).keyup(() => {
      this.table.search($(this.selectors.searchField).val()).draw();
    });

    // Clear all filters
    $(this.selectors.filterClearBtn).click((e) => {
      e.preventDefault();
      $(this.selectors.searchField).val("");
      $('.filters input[type="text"]').val("");
      this.table.search("").columns().search("").draw();
    });
  }

  /**
   * Setup DataTable
   */
  setupTable() {
    // Clone header for filters
    $(`${this.selectors.studentsTable} thead tr`)
      .clone(true)
      .attr("class", "filters")
      .appendTo(`${this.selectors.studentsTable} thead`);

    this.table = $(this.selectors.studentsTable).DataTable({
      fixedHeader: true,
      processing: true,
      serverSide: true,
      ajax: {
        url: $(this.selectors.studentsPageUrl).val(),
        type: "POST",
        dataType: "json",
        headers: { "X-CSRFToken": this.config.csrfToken },
      },
      columns: [
        { data: null },
        { data: "count" },
        { data: "fullname" },
        { data: "regnumber" },
        { data: "program" },
        { data: "action" },
      ],
      order: [[2, "asc"]],
      paging: true,
      pageLength: 10,
      lengthChange: true,
      autoWidth: true,
      searching: true,
      bInfo: true,
      bSort: true,
      orderCellsTop: true,
      columnDefs: [
        {
          targets: [0, 1, 5],
          orderable: false,
          className: "text-center",
        },
        {
          targets: 0,
          createdCell: (cell, cellData, rowData, rowIndex, colIndex) => {
            const checkbox = `<input type="checkbox" id="student-${rowData.id}" class="student-checkbox" value="${rowData.id}" />
            <label for="student-${rowData.id}"></label>`;
            $(cell).html(checkbox);
            $(cell).css("width", "30px");
          },
        },
        {
          targets: 5,
          createdCell: (cell, cellData, rowData, rowIndex, colIndex) => {
            const btn = `<button class="btn btn-sm btn-primary text-white me-1" onclick="fill_edit_form(${rowIndex}, ${rowData.id}, 'edit')"><i class="fas fa-rotate"></i></button>
            <button class="btn btn-sm btn-accent text-white" onclick="fill_edit_form('', ${rowData.id}, 'del')"><i class="fas fa-trash"></i></button>`;
            $(cell).html(btn);
          },
        },
        {
          targets: 4,
          createdCell: (cell, cellData, rowData, rowIndex, colIndex) => {
            $(cell).html(rowData.program);
            $(cell).addClass("prog_" + rowData.program_id);
          },
        },
        {
          targets: [2, 3, 4],
          className: "text-start text-nowrap ellipsis",
        },
      ],
      dom: "lBfrtip",
      buttons: this.getButtonConfig(),
      initComplete: () => this.initTableFilters(),
      language: {
        lengthMenu: "Show _MENU_ students",
        info: "Showing _START_ to _END_ of _TOTAL_ students",
        infoEmpty: "Showing 0 to 0 of 0 students",
        infoFiltered: "(filtered from _MAX_ total students)",
        zeroRecords: "No student available in table",
        paginate: {
          first: "First",
          last: "Last",
          next: "Next",
          previous: "Prev",
        },
      },
    });
  }

  /**
   * Get button configuration for DataTable
   */
  getButtonConfig() {
    const baseConfig = {
      className: "btn btn-extra text-white",
      title: "Students - Meddy Stationery",
      exportOptions: { columns: [1, 2, 3, 4] },
      action: this.getExportAction(),
    };

    return [
      {
        extend: "copy",
        text: "<i class='fas fa-clone'></i>",
        titleAttr: "Copy",
        ...baseConfig,
      },
      {
        extend: "pdf",
        text: "<i class='fas fa-file-pdf'></i>",
        titleAttr: "Export to PDF",
        filename: "students-medddy-stationery",
        orientation: "landscape",
        pageSize: "A4",
        footer: true,
        exportOptions: {
          ...baseConfig.exportOptions,
          search: "applied",
          order: "applied",
        },
        tableHeader: { alignment: "center" },
        customize: this.customizePDF.bind(this),
        ...baseConfig,
      },
      {
        extend: "excel",
        text: "<i class='fas fa-file-excel'></i>",
        titleAttr: "Export to Excel",
        ...baseConfig,
      },
      {
        extend: "print",
        text: "<i class='fas fa-print'></i>",
        titleAttr: "Print",
        orientation: "landscape",
        pageSize: "A4",
        footer: true,
        exportOptions: {
          ...baseConfig.exportOptions,
          search: "applied",
          order: "applied",
        },
        tableHeader: { alignment: "center" },
        customize: this.customizePrint.bind(this),
        ...baseConfig,
      },
    ];
  }

  /**
   * Customize PDF export
   */
  customizePDF(doc) {
    doc.styles.tableHeader.alignment = "center";
    doc.styles.tableBodyOdd.alignment = "center";
    doc.styles.tableBodyEven.alignment = "center";
    doc.styles.tableHeader.fontSize = 11;
    doc.defaultStyle.fontSize = 11;
    doc.content[1].table.widths = Array(doc.content[1].table.body[1].length + 1)
      .join("*")
      .split("");

    const body = doc.content[1].table.body;
    for (let i = 1; i < body.length; i++) {
      const cellConfigs = [
        { alignment: "center", margin: [3, 0, 0, 0] },
        { alignment: "left" },
        { alignment: "left" },
        { alignment: "left", margin: [0, 0, 3, 0] },
      ];

      cellConfigs.forEach((config, j) => {
        if (body[i][j]) {
          Object.assign(body[i][j], config);
          body[i][j].style = "vertical-align: middle;";
        }
      });
    }
  }

  getExportAction() {
    return function (e, dt, button, config) {
      var self = this;
      var oldStart = dt.settings()[0]._iDisplayStart;

      dt.one("preXhr", function (e, s, data) {
        data.start = 0;
        data.length = -1;

        dt.one("preDraw", function (e, settings) {
          if (button[0].className.indexOf("buttons-copy") >= 0) {
            $.fn.dataTable.ext.buttons.copyHtml5.action.call(
              self,
              e,
              dt,
              button,
              config,
            );
          } else if (button[0].className.indexOf("buttons-excel") >= 0) {
            $.fn.dataTable.ext.buttons.excelHtml5.action.call(
              self,
              e,
              dt,
              button,
              config,
            );
          } else if (button[0].className.indexOf("buttons-pdf") >= 0) {
            $.fn.dataTable.ext.buttons.pdfHtml5.action.call(
              self,
              e,
              dt,
              button,
              config,
            );
          } else if (button[0].className.indexOf("buttons-print") >= 0) {
            $.fn.dataTable.ext.buttons.print.action.call(
              self,
              e,
              dt,
              button,
              config,
            );
          }

          // Restore original view
          dt.one("preXhr", function (e, s, data) {
            settings._iDisplayStart = oldStart;
            data.start = oldStart;
          });

          setTimeout(function () {
            dt.ajax.reload(null, false); // Reload without resetting to page 1
          }, 0);

          return false; // dont re-draw table
        });
      });

      dt.ajax.reload(); // full-data fetch
    };
  }

  /**
   * Customize print output
   */
  customizePrint(win) {
    $(win.document.body).css("font-size", "11pt");
    $(win.document.body)
      .find("table")
      .addClass("compact")
      .css("font-size", "inherit");
  }

  /**
   * Initialize table filters
   */
  initTableFilters() {
    const api = this.table;

    api
      .columns(this.config.columnIndices)
      .eq(0)
      .each((colIdx) => {
        const cell = $(".filters th").eq(
          $(api.column(colIdx).header()).index(),
        );
        $(cell).addClass("bg-white");

        if (colIdx === 0 || colIdx === 1 || colIdx === 5) {
          cell.html("");
        } else {
          $(cell).html(
            "<input type='text' class='text-charcoal' placeholder='Filter..'/>",
          );
          $(cell).addClass("text-start");
          this.setupColumnFilter(cell, api, colIdx);
        }
      });
  }

  /**
   * Setup individual column filter
   */
  setupColumnFilter(cell, api, colIdx) {
    const input = $("input", cell);

    input.off("keyup change").on("keyup change", function (e) {
      e.stopPropagation();
      $(this).attr("title", $(this).val());
      const regexr = "{search}";
      const cursorPosition = this.selectionStart;

      api
        .column(colIdx)
        .search(
          this.value !== "" ? regexr.replace("{search}", this.value) : "",
          this.value !== "",
          this.value === "",
        )
        .draw();

      $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
    });
  }

  /**
   * Setup bulk delete functionality
   */
  setupBulkDelete() {
    // Select all checkbox
    $(document).on("change", this.selectors.selectAllCheckbox, () => {
      const isChecked = $(this.selectors.selectAllCheckbox).is(":checked");
      $(".student-checkbox").prop("checked", isChecked);
      this.toggleDeleteButton();
    });

    // Individual checkbox
    $(document).on("change", ".student-checkbox", () => {
      const total = $(".student-checkbox").length;
      const checked = $(".student-checkbox:checked").length;
      $(this.selectors.selectAllCheckbox).prop("checked", total === checked);
      this.toggleDeleteButton();
    });

    // Open modal button
    $(this.selectors.deleteSelectedBtn).on("click", () => {
      const checkedCount = $(".student-checkbox:checked").length;
      let sms = `<i class="fas fa-warning" style="font-size:40px"></i><br>Are you sure you want to delete all students?<br>This cannot be undone.`;
      if (checkedCount > 0)
        sms = `<i class="fas fa-warning" style="font-size:40px"></i><br>Are you sure you want to delete ${checkedCount} students?<br>This cannot be undone.`;

      $(this.selectors.deleteMultipleModal)
        .find(".warningTxt")
        .removeClass("text-success")
        .addClass("text-danger");
      $(this.selectors.deleteMultipleModal).find(".warningTxt").html(sms);
      $(this.selectors.confirmMultipleDelete)
        .removeClass("d-none")
        .addClass("d-inline-block");
      $(this.selectors.deleteMultipleModal).modal("show");
    });

    // Confirm deleting multiple/all
    $(this.selectors.confirmMultipleDelete).on("click", () => {
      this.handleBulkDelete();
    });
  }

  /**
   * Toggle delete button state
   */
  toggleDeleteButton() {
    const checkedCount = $(".student-checkbox:checked").length;
    const $btn = $(this.selectors.deleteSelectedBtn);

    $btn.toggleClass("disabled-btn", checkedCount === 0);

    if (checkedCount > 0) {
      $btn.html(`<i class="fas fa-trash"></i> (${checkedCount})`);
    } else {
      $btn.html('<i class="fas fa-trash"></i>');
    }
  }

  /**
   * Handle bulk delete
   */
  handleBulkDelete() {
    if (this.allow_bulk_delete === false) return;

    this.allow_bulk_delete = false;
    const selectedIds = $(".student-checkbox:checked")
      .map(function () {
        return Number($(this).val());
      })
      .get();

    const form = $(this.selectors.deleteStudentForm);
    const formSms = $(this.selectors.deleteMultipleModal).find(
      ".modal-body .formsms",
    );
    const submitBtn = $(this.selectors.confirmMultipleDelete);
    const checkedCount = $(".student-checkbox:checked").length;
    const deleteType = checkedCount === 0 ? "all" : "multiple";
    const formData = new FormData();
    formData.append("students_list", selectedIds);
    formData.append("delete_type", deleteType);

    $.ajax({
      type: "POST",
      url: form.attr("action"),
      data: formData,
      dataType: "json",
      contentType: false,
      processData: false,
      headers: { "X-CSRFToken": this.config.csrfToken },
      beforeSend: () => {
        submitBtn.html("<i class='fas fa-spinner fa-pulse'></i>");
      },
      success: (response) => {
        this.allow_bulk_delete = true;
        submitBtn.html("Delete");

        if (response.success) {
          $(this.selectors.confirmMultipleDelete)
            .removeClass("d-inline-block")
            .addClass("d-none");
          $(".student-checkbox").prop("checked", false);
          this.toggleDeleteButton();
          let sms = `<i class="fas fa-check-circle" style="font-size:35px"></i><br><br>${response.sms}`;
          $(this.selectors.deleteMultipleModal)
            .find(".warningTxt")
            .removeClass("text-danger")
            .addClass("text-success");
          $(this.selectors.deleteMultipleModal).find(".warningTxt").html(sms);
          this.table.draw();
        } else {
          this.displayAlert(formSms, response.success, response.sms);
        }
      },
      error: (xhr, status, error) => {
        this.allow_bulk_delete = true;
        submitBtn.html("Delete");
        let message = "Server error.";

        if (status === "timeout") {
          message = "Request timed out.";
        } else if (xhr.status === 0) {
          message = "No internet connection.";
        } else {
          console.log("Server error:", xhr.status);
        }

        this.displayAlert(formSms, false, message);
      },
    });
  }
}

// Initialize the application when DOM is ready
$(function () {
  new StudentsManager();
});
