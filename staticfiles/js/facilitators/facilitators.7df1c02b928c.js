class FacilitatorsManager {
  constructor() {
    this.config = {
      columnIndices: [0, 1, 2, 3, 4],
      dateCache: { start: null, end: null },
      csrfToken: this.getCSRFToken(),
    };

    this.selectors = {
      newFacilitatorForm: "#new_facilitator_form",
      editFacilitatorForm: "#edit_facilitator_form",
      deleteFacilitatorForm: "#del_facilitator_form",
      facilitatorsTable: "#facilitators_table",
      updateFacilitatorCanvas: "#edit_facilitator_canvas",
      deleteFacilitatorModal: "#delete_facilitator_modal",
      searchField: "#search_facilitator_field",
      facilitatorsPageUrl: "#facilitators_page_url",

      // Form fields
      facilitatorNames: "#facilitator_names",
      facilitatorAbbrev: "#facilitator_abbrev",
      facilitatorDescription: "#facilitator_description",
      facilitatorEditNames: "#facilitator_edit_names",
      facilitatorEditAbbrev: "#facilitator_edit_abbrev",
      facilitatorEditDescription: "#facilitator_edit_description",
      facilitatorId: "#edit_facilitator_id",
      facilitatorDelId: "#facilitator_del_id",

      excelFacilForm: "#excel_facil_form",
      excelFacilBtn: "#excel_facil_btn",
      excelFile: "#facil_excel_file",
      modeToggle: 'input[name="entry_mode"]',
      singleContainer: "#single_entry_container",
      multiContainer: "#multi_entry_container",

      // Buttons
      newFacilitatorBtn: "#new_facilitator_btn",
      filterClearBtn: "#facilitators_filter_clear",
      facilitatorEditBtn: "#facilitator_edit_btn",
      facilitatorDeleteBtn: "#facilitator_delete_btn",
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
        `${this.selectors.facilitatorsTable} tbody tr:nth-child(${
          rowIndex + 1
        })`,
      );
      const names = $("td:nth-child(2)", row).text();
      const comment = $("td:nth-child(4)", row).text();

      $(this.selectors.facilitatorEditNames).val(names);
      $(this.selectors.facilitatorEditDescription).val(comment);
      $(this.selectors.facilitatorId).val(id);
      $(this.selectors.updateFacilitatorCanvas).offcanvas("show");
    } else {
      $(this.selectors.facilitatorDelId).val(id);
      $(this.selectors.deleteFacilitatorModal).modal("show");
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
    this.setupNewFacilitatorForm();
    this.setupExcelFacilForm();
    this.setupEditFacilitatorForm();
    this.setupDeleteFacilitatorForm();
    this.setupSearchAndFilters();

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
   * Setup new facilitator form
   */
  setupNewFacilitatorForm() {
    $(this.selectors.newFacilitatorForm).submit((e) => {
      e.preventDefault();
      const form = $(this.selectors.newFacilitatorForm);
      const submitBtn = $(this.selectors.newFacilitatorBtn);
      const formSms = $(`${this.selectors.newFacilitatorForm} .formsms`);

      this.handleNewFacilitatorSubmit(form, submitBtn, formSms);
    });
  }

  /**
   * Handle new facilitator form submission
   */
  handleNewFacilitatorSubmit(form, submitBtn, formSms) {
    const formData = new FormData();
    formData.append("name", $.trim($(this.selectors.facilitatorNames).val()));
    formData.append(
      "comment",
      $.trim($(this.selectors.facilitatorDescription).val()),
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
          $(this.selectors.newFacilitatorForm)[0].reset();
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
  setupExcelFacilForm() {
    $(this.selectors.excelFacilForm).submit((e) => {
      e.preventDefault();
      const form = $(this.selectors.excelFacilForm);
      const submitBtn = $(this.selectors.excelFacilBtn);
      const formSms = $(`${this.selectors.excelFacilForm} .formsms`);

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
   * Setup edit facilitator form
   */
  setupEditFacilitatorForm() {
    $(this.selectors.editFacilitatorForm).submit((e) => {
      e.preventDefault();
      const formSms = $(`${this.selectors.editFacilitatorForm} .formsms`);
      const submitBtn = $(this.selectors.facilitatorEditBtn);

      this.handleEditFacilitatorSubmit(submitBtn, formSms);
    });
  }

  /**
   * Handle edit facilitator form submission
   */
  handleEditFacilitatorSubmit(submitBtn, formSms) {
    const form = $(this.selectors.editFacilitatorForm);
    const formData = new FormData();
    formData.append("facilitator_id", $(this.selectors.facilitatorId).val());
    formData.append(
      "name",
      $.trim($(this.selectors.facilitatorEditNames).val()),
    );
    formData.append(
      "comment",
      $.trim($(this.selectors.facilitatorEditDescription).val()),
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
   * Setup delete facilitator form
   */
  setupDeleteFacilitatorForm() {
    $(this.selectors.deleteFacilitatorForm).submit((e) => {
      e.preventDefault();
      const delFacilitatorId = $(this.selectors.facilitatorDelId).val();

      if (parseInt(delFacilitatorId) > 0) {
        const submitBtn = $(this.selectors.facilitatorDeleteBtn);
        const formSms = $(`${this.selectors.deleteFacilitatorForm} .formsms`);
        this.handleDeleteFacilitatorSubmit(
          submitBtn,
          formSms,
          delFacilitatorId,
        );
      }
    });
  }

  /**
   * Handle delete facilitator form submission
   */
  handleDeleteFacilitatorSubmit(submitBtn, formSms, delFacilitatorId) {
    const form = $(this.selectors.deleteFacilitatorForm);
    const formData = new FormData();
    formData.append("delete_id", delFacilitatorId);

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
          $(this.selectors.facilitatorDelId).val("");
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
    $(`${this.selectors.facilitatorsTable} thead tr`)
      .clone(true)
      .attr("class", "filters")
      .appendTo(`${this.selectors.facilitatorsTable} thead`);

    this.table = $(this.selectors.facilitatorsTable).DataTable({
      fixedHeader: true,
      processing: true,
      serverSide: true,
      ajax: {
        url: $(this.selectors.facilitatorsPageUrl).val(),
        type: "POST",
        dataType: "json",
        headers: { "X-CSRFToken": this.config.csrfToken },
      },
      columns: [
        { data: "count" },
        { data: "name" },
        { data: "courses" },
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
      title: "Facilitators - Meddy Stationery",
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
        filename: "facilitators-medddy-stationery",
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
  new FacilitatorsManager();
});
