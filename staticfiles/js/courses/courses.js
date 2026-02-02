class CoursesManager {
  constructor() {
    this.config = {
      columnIndices: [0, 1, 2, 3, 4, 5],
      dateCache: { start: null, end: null },
      csrfToken: this.getCSRFToken(),
    };

    this.allow_bulk_delete = true;

    this.selectors = {
      newCourseForm: "#new_course_form",
      editCourseForm: "#edit_course_form",
      deleteCourseForm: "#del_course_form",
      transferFacilForm: "#change_facil_form",
      coursesTable: "#courses_table",
      updateCourseCanvas: "#edit_course_canvas",
      newCourseCanvas: "#new_course_canvas",
      transferFacilCanvas: "#change_facil_canvas",
      deleteCourseModal: "#delete_course_modal",
      searchField: "#search_course_field",
      coursesPageUrl: "#courses_page_url",
      deleteMultipleModal: "#delete_all_courses",

      // Form fields
      courseNames: "#course_names",
      courseCode: "#course_code",
      courseFacilitator: "#course_facilitator",
      courseEditNames: "#course_edit_names",
      courseEditCode: "#course_edit_code",
      courseEditFacilitator: "#course_edit_facilitator",
      courseId: "#edit_course_id",
      courseDelId: "#course_del_id",
      transferFacilStart: "#change_facil_start",
      transferFacilEnd: "#change_facil_end",

      excelCourseForm: "#excel_course_form",
      excelCourseBtn: "#excel_course_btn",
      excelFile: "#course_excel_file",
      modeToggle: 'input[name="entry_mode"]',
      singleContainer: "#single_entry_container",
      multiContainer: "#multi_entry_container",

      // Buttons
      newCourseBtn: "#new_course_btn",
      filterClearBtn: "#courses_filter_clear",
      courseEditBtn: "#course_edit_btn",
      courseDeleteBtn: "#course_delete_btn",
      selectAllCheckbox: "#select-all",
      deleteSelectedBtn: "#delete_selected_btn",
      confirmMultipleDelete: "#btn_confirm_multiple_delete",
      transferFacilBtn: "#facil_transfer_btn",
    };

    this.table = null;
    this.facilitatorOptions = null;
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
    this.facilitatorOptions = $(`${this.selectors.courseFacilitator} option`);
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
        offcanvas: this.selectors.newCourseCanvas,
        select: this.selectors.courseFacilitator,
        options: {
          placeholder: "Search facilitator...",
          allowClear: true,
          noResultsText: "No facilitator found",
        },
      },
      {
        offcanvas: this.selectors.updateCourseCanvas,
        select: this.selectors.courseEditFacilitator,
        options: {
          placeholder: "Search facilitator...",
          allowClear: true,
          noResultsText: "No facilitator found",
        },
      },
      {
        offcanvas: this.selectors.transferFacilCanvas,
        select: this.selectors.transferFacilStart,
        options: {
          placeholder: "Search facilitator...",
          allowClear: true,
          noResultsText: "No facilitator found",
        },
      },
      {
        offcanvas: this.selectors.transferFacilCanvas,
        select: this.selectors.transferFacilEnd,
        options: {
          placeholder: "Search facilitator...",
          allowClear: true,
          noResultsText: "No facilitator found",
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
        `${this.selectors.coursesTable} tbody tr:nth-child(${rowIndex + 1})`,
      );
      const names = $("td:nth-child(3)", row).text();
      const code = $("td:nth-child(4)", row).text();

      const facilClassName = $("td:nth-child(5)", row).attr("class");
      if (facilClassName && facilClassName.includes("facil_")) {
        const facilitatorId = facilClassName.split("facil_")[1];
        if (facilitatorId) {
          $(this.selectors.courseEditFacilitator)
            .val(facilitatorId)
            .trigger("change");
        } else {
          $(this.selectors.courseEditFacilitator).val(null).trigger("change");
        }
      }

      $(this.selectors.courseEditNames).val(names);
      $(this.selectors.courseEditCode).val(code);
      $(this.selectors.courseId).val(id);
      $(this.selectors.updateCourseCanvas).offcanvas("show");
    } else {
      $(this.selectors.courseDelId).val(id);
      $(this.selectors.deleteCourseModal).modal("show");
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
    this.setupNewCourseForm();
    this.setupExcelCourseForm();
    this.setupEditCourseForm();
    this.setupFacilChangeForm();
    this.setupDeleteCourseForm();
    this.setupSearchAndFilters();
    this.setupBulkDelete();

    // Toggle between Single and Multi facilitators form
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
   * Setup new course form
   */
  setupNewCourseForm() {
    $(this.selectors.newCourseForm).submit((e) => {
      e.preventDefault();
      const form = $(this.selectors.newCourseForm);
      const submitBtn = $(this.selectors.newCourseBtn);
      const formSms = $(`${this.selectors.newCourseForm} .formsms`);

      this.handleNewCourseSubmit(form, submitBtn, formSms);
    });
  }

  /**
   * Handle new course form submission
   */
  handleNewCourseSubmit(form, submitBtn, formSms) {
    const formData = new FormData();
    formData.append("name", $.trim($(this.selectors.courseNames).val()));
    formData.append("code", $.trim($(this.selectors.courseCode).val()));
    formData.append(
      "facilitator",
      $.trim($(this.selectors.courseFacilitator).val()),
    );

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
          $(this.selectors.newCourseForm)[0].reset();
          $(this.selectors.courseFacilitator).val(null).trigger("change");
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
  setupExcelCourseForm() {
    $(this.selectors.excelCourseForm).submit((e) => {
      e.preventDefault();
      const form = $(this.selectors.excelCourseForm);
      const submitBtn = $(this.selectors.excelCourseBtn);
      const formSms = $(`${this.selectors.excelCourseForm} .formsms`);

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
   * Setup edit course form
   */
  setupEditCourseForm() {
    $(this.selectors.editCourseForm).submit((e) => {
      e.preventDefault();
      const formSms = $(`${this.selectors.editCourseForm} .formsms`);
      const submitBtn = $(this.selectors.courseEditBtn);

      this.handleEditCourseSubmit(submitBtn, formSms);
    });
  }

  /**
   * Handle edit course form submission
   */
  handleEditCourseSubmit(submitBtn, formSms) {
    const form = $(this.selectors.editCourseForm);
    const formData = new FormData();
    formData.append("course_id", $(this.selectors.courseId).val());
    formData.append("name", $.trim($(this.selectors.courseEditNames).val()));
    formData.append("code", $.trim($(this.selectors.courseEditCode).val()));
    formData.append(
      "facilitator",
      $.trim($(this.selectors.courseEditFacilitator).val()),
    );

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

        if (response.success) {
          this.table.draw();
        }
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
   * Setup delete course form
   */
  setupDeleteCourseForm() {
    $(this.selectors.deleteCourseForm).submit((e) => {
      e.preventDefault();
      const delCourseId = $(this.selectors.courseDelId).val();

      if (parseInt(delCourseId) > 0) {
        const submitBtn = $(this.selectors.courseDeleteBtn);
        const formSms = $(`${this.selectors.deleteCourseForm} .formsms`);
        this.handleDeleteCourseSubmit(submitBtn, formSms, delCourseId);
      }
    });
  }

  /**
   * Handle delete course form submission
   */
  handleDeleteCourseSubmit(submitBtn, formSms, delCourseId) {
    const form = $(this.selectors.deleteCourseForm);
    const formData = new FormData();
    formData.append("delete_id", delCourseId);

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
          $(this.selectors.courseDelId).val("");
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
   * Setup course transfer form
   */
  setupFacilChangeForm() {
    $(this.selectors.transferFacilForm).submit((e) => {
      e.preventDefault();
      const formSms = $(`${this.selectors.transferFacilForm} .formsms`);
      const submitBtn = $(this.selectors.transferFacilBtn);

      this.handleFacilTransferSubmit(submitBtn, formSms);
    });
  }

  /**
   * Handle course transfer form submission
   */
  handleFacilTransferSubmit(submitBtn, formSms) {
    const facilStart = $(this.selectors.transferFacilStart).val();
    const facilEnd = $(this.selectors.transferFacilEnd).val();

    if (facilStart == "" || facilEnd == "") {
      this.displayAlert(
        formSms,
        false,
        "Please select facilitator in both fields.",
      );
      return;
    }

    if (parseInt(facilStart) === parseInt(facilEnd)) {
      this.displayAlert(
        formSms,
        false,
        "Please select two different facilitators.",
      );
      return;
    }

    const form = $(this.selectors.transferFacilForm);
    const formData = new FormData();
    formData.append("facil_change_start", parseInt(facilStart));
    formData.append("facil_change_end", parseInt(facilEnd));

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
        $(this.selectors.transferFacilForm)[0].reset();
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
    $(`${this.selectors.coursesTable} thead tr`)
      .clone(true)
      .attr("class", "filters")
      .appendTo(`${this.selectors.coursesTable} thead`);

    this.table = $(this.selectors.coursesTable).DataTable({
      fixedHeader: true,
      processing: true,
      serverSide: true,
      ajax: {
        url: $(this.selectors.coursesPageUrl).val(),
        type: "POST",
        dataType: "json",
        headers: { "X-CSRFToken": this.config.csrfToken },
      },
      columns: [
        { data: null },
        { data: "count" },
        { data: "name" },
        { data: "code" },
        { data: "facilitator" },
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
            const checkbox = `<input type="checkbox" id="course-${rowData.id}" class="course-checkbox" value="${rowData.id}" />
            <label for="course-${rowData.id}"></label>`;
            $(cell).html(checkbox);
            $(cell).css("width", "30px");
          },
        },
        {
          targets: 5,
          createdCell: (cell, cellData, rowData, rowIndex, colIndex) => {
            const btn = `<button class="btn btn-sm btn-primary text-white me-1" onclick="fill_edit_form(${rowIndex}, ${rowData.id}, 'edit')"><i class="fas fa-rotate"></i></button> <button class="btn btn-sm btn-accent text-white" onclick="fill_edit_form('', ${rowData.id}, 'del')"><i class="fas fa-trash"></i></button>`;
            $(cell).html(btn);
          },
        },
        {
          targets: 4,
          createdCell: (cell, cellData, rowData, rowIndex, colIndex) => {
            $(cell).html(rowData.facilitator);
            $(cell).addClass("facil_" + rowData.facilitator_id);
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
        lengthMenu: "Show _MENU_ courses",
        info: "Showing _START_ to _END_ of _TOTAL_ courses",
        infoEmpty: "Showing 0 to 0 of 0 courses",
        infoFiltered: "(filtered from _MAX_ total courses)",
        zeroRecords: "No course available in table",
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
      title: "Courses - Meddy Stationery",
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
        filename: "courses-medddy-stationery",
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
        } else if (colIdx === 4) {
          const select = document.createElement("select");
          select.className = "select-filter text-charcoal float-start";
          select.innerHTML = `<option value="">All</option>`;
          select.innerHTML += `<option value="n/a">-no facilitator-</option>`;

          this.facilitatorOptions.each((index, option) => {
            if (index === 0) return;
            select.innerHTML += `<option value="${$(option).attr("value")}">${$(option).text()}</option>`;
          });

          cell.html(select);
          $(select).on("change", function () {
            api.column(colIdx).search($(this).val()).draw();
          });
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
      $(".course-checkbox").prop("checked", isChecked);
      this.toggleDeleteButton();
    });

    // Individual checkbox
    $(document).on("change", ".course-checkbox", () => {
      const total = $(".course-checkbox").length;
      const checked = $(".course-checkbox:checked").length;
      $(this.selectors.selectAllCheckbox).prop("checked", total === checked);
      this.toggleDeleteButton();
    });

    // Open modal button
    $(this.selectors.deleteSelectedBtn).on("click", () => {
      const checkedCount = $(".course-checkbox:checked").length;
      let sms = `<i class="fas fa-warning" style="font-size:40px"></i><br>Are you sure you want to delete all courses?<br>This cannot be undone.`;
      if (checkedCount > 0)
        sms = `<i class="fas fa-warning" style="font-size:40px"></i><br>Are you sure you want to delete ${checkedCount} courses?<br>This cannot be undone.`;

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
    const checkedCount = $(".course-checkbox:checked").length;
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
    const selectedIds = $(".course-checkbox:checked")
      .map(function () {
        return Number($(this).val());
      })
      .get();

    const form = $(this.selectors.deleteCourseForm);
    const formSms = $(this.selectors.deleteMultipleModal).find(
      ".modal-body .formsms",
    );
    const submitBtn = $(this.selectors.confirmMultipleDelete);
    const checkedCount = $(".course-checkbox:checked").length;
    const deleteType = checkedCount === 0 ? "all" : "multiple";
    const formData = new FormData();
    formData.append("courses_list", selectedIds);
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
          $(".course-checkbox").prop("checked", false);
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
  new CoursesManager();
});
