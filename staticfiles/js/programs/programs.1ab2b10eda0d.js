class ProgramsManager {
  constructor() {
    this.config = {
      columnIndices: [0, 1, 2, 3, 4],
      dateCache: { start: null, end: null },
      csrfToken: this.getCSRFToken(),
    };

    this.selectors = {
      newProgramForm: "#new_program_form",
      editProgramForm: "#edit_program_form",
      deleteProgramForm: "#del_program_form",
      programsTable: "#programs_table",
      updateProgramCanvas: "#edit_program_canvas",
      deleteProgramModal: "#delete_program_modal",
      searchField: "#search_program_field",
      programsPageUrl: "#programs_page_url",

      // Form fields
      programNames: "#program_names",
      programAbbrev: "#program_abbrev",
      programDescription: "#program_description",
      programEditNames: "#program_edit_names",
      programEditAbbrev: "#program_edit_abbrev",
      programEditDescription: "#program_edit_description",
      programId: "#edit_program_id",
      programDelId: "#program_del_id",

      excelProgramForm: "#excel_program_form",
      excelProgramBtn: "#excel_program_btn",
      excelFile: "#program_excel_file",
      modeToggle: 'input[name="entry_mode"]',
      singleContainer: "#single_entry_container",
      multiContainer: "#multi_entry_container",

      // Buttons
      newProgramBtn: "#new_program_btn",
      filterClearBtn: "#programs_filter_clear",
      programEditBtn: "#program_edit_btn",
      programDeleteBtn: "#program_delete_btn",
    };

    this.table = null;
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
    this.setupTable();
    this.setupEventHandlers();
  }

  /**
   * Fill edit form with data
   */
  fillEditForm(rowIndex, id, action) {
    if (action === "edit") {
      const row = $(
        `${this.selectors.programsTable} tbody tr:nth-child(${rowIndex + 1})`,
      );
      const names = $("td:nth-child(2)", row).text();
      const abbrev = $("td:nth-child(3)", row).text();
      const comment = $("td:nth-child(4)", row).text();

      $(this.selectors.programEditNames).val(names);
      $(this.selectors.programEditAbbrev).val(abbrev);
      $(this.selectors.programEditDescription).val(comment);
      $(this.selectors.programId).val(id);
      $(this.selectors.updateProgramCanvas).offcanvas("show");
    } else {
      $(this.selectors.programDelId).val(id);
      $(this.selectors.deleteProgramModal).modal("show");
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

  /**
   * Setup all event handlers
   */
  setupEventHandlers() {
    this.setupNewProgramForm();
    this.setupExcelProgramForm();
    this.setupEditProgramForm();
    this.setupDeleteProgramForm();
    this.setupSearchAndFilters();

    // Toggle between Single and Multi programs form
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
   * Setup new program form
   */
  setupNewProgramForm() {
    $(this.selectors.newProgramForm).submit((e) => {
      e.preventDefault();
      const form = $(this.selectors.newProgramForm);
      const submitBtn = $(this.selectors.newProgramBtn);
      const formSms = $(`${this.selectors.newProgramForm} .formsms`);

      this.handleNewProgramSubmit(form, submitBtn, formSms);
    });
  }

  /**
   * Handle new program form submission
   */
  handleNewProgramSubmit(form, submitBtn, formSms) {
    const formData = new FormData();
    formData.append("name", $.trim($(this.selectors.programNames).val()));
    formData.append("abbrev", $.trim($(this.selectors.programAbbrev).val()));
    formData.append(
      "comment",
      $.trim($(this.selectors.programDescription).val()),
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

        const feedback = this.generateAlert(response.success, response.sms);
        formSms.html(feedback);

        if (response.success) {
          $(this.selectors.newProgramForm)[0].reset();
          this.table.draw();
        }
      },
      error: (xhr, status, error) => {
        submitBtn.html("Add").attr("type", "submit");
        let feedback = this.generateAlert(false, "Server error.");

        if (status === "timeout") {
          feedback = this.generateAlert(false, "Request timed out.");
        } else if (xhr.status === 0) {
          feedback = this.generateAlert(false, "No internet connection.");
        } else {
          console.log("Server error:", xhr.status);
        }

        formSms.html(feedback);
      },
    });
  }

  /**
   * Setup excel upload form
   */
  setupExcelProgramForm() {
    $(this.selectors.excelProgramForm).submit((e) => {
      e.preventDefault();
      const form = $(this.selectors.excelProgramForm);
      const submitBtn = $(this.selectors.excelProgramBtn);
      const formSms = $(`${this.selectors.excelProgramForm} .formsms`);

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
        const feedback = this.generateAlert(response.success, response.sms);
        formSms.html(feedback);
        form[0].reset();
        this.table.draw();
      },
      error: () => {
        submitBtn.html("Upload").attr("type", "submit");
        formSms.html(this.generateAlert(false, "Server error during upload."));
      },
    });
  }

  /**
   * Setup edit program form
   */
  setupEditProgramForm() {
    $(this.selectors.editProgramForm).submit((e) => {
      e.preventDefault();
      const formSms = $(`${this.selectors.editProgramForm} .formsms`);
      const submitBtn = $(this.selectors.programEditBtn);

      this.handleEditProgramSubmit(submitBtn, formSms);
    });
  }

  /**
   * Handle edit program form submission
   */
  handleEditProgramSubmit(submitBtn, formSms) {
    const form = $(this.selectors.editProgramForm);
    const formData = new FormData();
    formData.append("program_id", $(this.selectors.programId).val());
    formData.append("name", $.trim($(this.selectors.programEditNames).val()));
    formData.append(
      "abbrev",
      $.trim($(this.selectors.programEditAbbrev).val()),
    );
    formData.append(
      "comment",
      $.trim($(this.selectors.programEditDescription).val()),
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

        const feedback = this.generateAlert(response.success, response.sms);
        formSms.html(feedback);

        if (response.success) {
          this.table.draw();
        }
      },
      error: (xhr, status, error) => {
        submitBtn.html("Update").attr("type", "submit");
        let feedback = this.generateAlert(false, "Server error.");

        if (status === "timeout") {
          feedback = this.generateAlert(false, "Request timed out.");
        } else if (xhr.status === 0) {
          feedback = this.generateAlert(false, "No internet connection.");
        } else {
          console.log("Server error:", xhr.status);
        }

        formSms.html(feedback);
      },
    });
  }

  /**
   * Setup delete program form
   */
  setupDeleteProgramForm() {
    $(this.selectors.deleteProgramForm).submit((e) => {
      e.preventDefault();
      const delProgramId = $(this.selectors.programDelId).val();

      if (parseInt(delProgramId) > 0) {
        const submitBtn = $(this.selectors.programDeleteBtn);
        const formSms = $(`${this.selectors.deleteProgramForm} .formsms`);
        this.handleDeleteProgramSubmit(submitBtn, formSms, delProgramId);
      }
    });
  }

  /**
   * Handle delete program form submission
   */
  handleDeleteProgramSubmit(submitBtn, formSms, delProgramId) {
    const form = $(this.selectors.deleteProgramForm);
    const formData = new FormData();
    formData.append("delete_id", delProgramId);

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

        const feedback = this.generateAlert(response.success, response.sms);
        formSms.html(feedback);

        if (response.success) {
          $(this.selectors.programDelId).val("");
          this.table.draw();
        }
      },
      error: (xhr, status, error) => {
        submitBtn.html("Yes").attr("type", "submit");
        let feedback = this.generateAlert(false, "Server error.");

        if (status === "timeout") {
          feedback = this.generateAlert(false, "Request timed out.");
        } else if (xhr.status === 0) {
          feedback = this.generateAlert(false, "No internet connection.");
        } else {
          console.log("Server error:", xhr.status);
        }

        formSms.html(feedback);
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
    $(`${this.selectors.programsTable} thead tr`)
      .clone(true)
      .attr("class", "filters")
      .appendTo(`${this.selectors.programsTable} thead`);

    this.table = $(this.selectors.programsTable).DataTable({
      fixedHeader: true,
      processing: true,
      serverSide: true,
      ajax: {
        url: $(this.selectors.programsPageUrl).val(),
        type: "POST",
        dataType: "json",
        headers: { "X-CSRFToken": this.config.csrfToken },
      },
      columns: [
        { data: "count" },
        { data: "name" },
        { data: "abbrev" },
        { data: "comment" },
        { data: "action" },
      ],
      order: [[1, "asc"]],
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
          targets: [0, 4],
          orderable: false,
          className: "text-center",
        },
        {
          targets: 4,
          createdCell: (cell, cellData, rowData, rowIndex, colIndex) => {
            const btn = `<button class="btn btn-sm btn-primary text-white me-1" onclick="fill_edit_form(${rowIndex}, ${rowData.id}, 'edit')"><i class="fas fa-rotate"></i></button> <button class="btn btn-sm btn-accent text-white" onclick="fill_edit_form('', ${rowData.id}, 'del')"><i class="fas fa-trash"></i></button>`;
            $(cell).html(btn);
          },
        },
        {
          targets: [1, 2, 3],
          className: "text-start text-nowrap ellipsis",
        },
      ],
      dom: "lBfrtip",
      buttons: this.getButtonConfig(),
      initComplete: () => this.initTableFilters(),
    });
  }

  /**
   * Get button configuration for DataTable
   */
  getButtonConfig() {
    const baseConfig = {
      className: "btn btn-extra text-white",
      title: "Programs - Meddy Stationery",
      exportOptions: { columns: [0, 1, 2, 3] },
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
        filename: "programs-medddy-stationery",
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

        if (colIdx === 0 || colIdx === 4) {
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
}

// Initialize the application when DOM is ready
$(function () {
  new ProgramsManager();
});
