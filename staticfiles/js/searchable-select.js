/**
 * SearchableSelect - A lightweight, customizable searchable select component
 * No external dependencies required (just jQuery which you already have)
 */
class SearchableSelect {
  constructor(selectElement, options = {}) {
    this.select = $(selectElement);
    this.options = {
      placeholder: options.placeholder || "Search...",
      noResultsText: options.noResultsText || "No results found",
      allowClear: options.allowClear !== false,
      maxHeight: options.maxHeight || "250px",
      ...options,
    };

    this.isOpen = false;
    this.selectedValue = this.select.val();
    this.init();
  }

  init() {
    // Hide original select
    this.select.hide();

    // Create custom select structure
    this.createCustomSelect();

    // Bind events
    this.bindEvents();

    // Set initial value
    this.updateDisplay();
  }

  createCustomSelect() {
    const wrapper = $("<div>", { class: "custom-select-wrapper" });

    // Display box (what user clicks)
    const display = $("<div>", {
      class: "custom-select-display",
      tabindex: "0",
    });

    const displayText = $("<span>", { class: "custom-select-text" });

    const clearBtn = $("<span>", {
      class: "custom-select-clear",
      html: "&times;",
      style: this.options.allowClear ? "" : "display: none;",
    });

    const arrow = $("<span>", {
      class: "custom-select-arrow",
      html: "&#9660;",
    });

    display.append(displayText, clearBtn, arrow);

    // Dropdown container
    const dropdown = $("<div>", { class: "custom-select-dropdown" });

    // Search input
    const searchBox = $("<div>", { class: "custom-select-search" });
    const searchInput = $("<input>", {
      type: "text",
      class: "custom-select-search-input",
      placeholder: this.options.placeholder,
    });
    searchBox.append(searchInput);

    // Options list
    const optionsList = $("<div>", {
      class: "custom-select-options",
      style: `max-height: ${this.options.maxHeight}`,
    });

    // Populate options
    this.populateOptions(optionsList);

    // No results message
    const noResults = $("<div>", {
      class: "custom-select-no-results",
      text: this.options.noResultsText,
      style: "display: none;",
    });

    dropdown.append(searchBox, optionsList, noResults);
    wrapper.append(display, dropdown);

    // Insert after original select
    this.select.after(wrapper);

    // Store references
    this.wrapper = wrapper;
    this.display = display;
    this.displayText = displayText;
    this.clearBtn = clearBtn;
    this.arrow = arrow;
    this.dropdown = dropdown;
    this.searchInput = searchInput;
    this.optionsList = optionsList;
    this.noResults = noResults;
  }

  populateOptions(container) {
    container.empty();

    this.select.find("option").each((index, option) => {
      const $option = $(option);
      const value = $option.val();
      const text = $option.text();

      if (value === "") return; // Skip placeholder option

      const optionDiv = $("<div>", {
        class: "custom-select-option",
        "data-value": value,
        text: text,
      });

      if (value === this.selectedValue) {
        optionDiv.addClass("selected");
      }

      container.append(optionDiv);
    });
  }

  bindEvents() {
    // Toggle dropdown
    this.display.on("click", (e) => {
      if (!$(e.target).hasClass("custom-select-clear")) {
        this.toggle();
      }
    });

    // Clear button
    this.clearBtn.on("click", (e) => {
      e.stopPropagation();
      this.clear();
    });

    // Search input
    this.searchInput.on("input", () => {
      this.filterOptions();
    });

    // Prevent search input from closing dropdown
    this.searchInput.on("click", (e) => {
      e.stopPropagation();
    });

    // Option selection
    this.optionsList.on("click", ".custom-select-option", (e) => {
      const value = $(e.currentTarget).data("value");
      this.selectValue(value);
    });

    // Close on outside click
    $(document).on("click", (e) => {
      if (
        !this.wrapper.is(e.target) &&
        this.wrapper.has(e.target).length === 0
      ) {
        this.close();
      }
    });

    // Keyboard navigation
    this.display.on("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.toggle();
      }
    });

    this.searchInput.on("keydown", (e) => {
      if (e.key === "Escape") {
        this.close();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const firstVisible = this.optionsList.find(
          ".custom-select-option:visible:first"
        );
        if (firstVisible.length) {
          this.selectValue(firstVisible.data("value"));
        }
      }
    });

    // Listen for external changes to the original select
    this.select.on("change", () => {
      const newValue = this.select.val();
      if (newValue !== this.selectedValue) {
        this.selectedValue = newValue;
        this.updateDisplay();
        this.optionsList.find(".custom-select-option").removeClass("selected");
        if (newValue) {
          this.optionsList
            .find(`[data-value="${newValue}"]`)
            .addClass("selected");
        }
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.dropdown.slideDown(200);
    this.wrapper.addClass("open");
    this.arrow.html("&#9650;");
    this.isOpen = true;
    this.searchInput.focus();
  }

  close() {
    this.dropdown.slideUp(200);
    this.wrapper.removeClass("open");
    this.arrow.html("&#9660;");
    this.isOpen = false;
    this.searchInput.val("");
    this.filterOptions();
  }

  selectValue(value) {
    this.selectedValue = value;
    this.select.val(value).trigger("change");
    this.updateDisplay();
    this.close();

    // Update selected class
    this.optionsList.find(".custom-select-option").removeClass("selected");
    this.optionsList.find(`[data-value="${value}"]`).addClass("selected");
  }

  clear() {
    this.selectedValue = "";
    this.select.val("").trigger("change");
    this.updateDisplay();

    // Remove selected class from all options
    this.optionsList.find(".custom-select-option").removeClass("selected");
  }

  updateDisplay() {
    if (this.selectedValue) {
      const selectedOption = this.select.find(
        `option[value="${this.selectedValue}"]`
      );
      this.displayText.text(selectedOption.text());
      this.displayText.removeClass("placeholder");
      if (this.options.allowClear) {
        this.clearBtn.show();
      }
    } else {
      const placeholderText = this.select.find('option[value=""]').text();
      this.displayText.text(placeholderText);
      this.displayText.addClass("placeholder");
      this.clearBtn.hide();
    }
  }

  filterOptions() {
    const searchTerm = this.searchInput.val().toLowerCase();
    let hasResults = false;

    this.optionsList.find(".custom-select-option").each(function () {
      const text = $(this).text().toLowerCase();
      if (text.includes(searchTerm)) {
        $(this).show();
        hasResults = true;
      } else {
        $(this).hide();
      }
    });

    if (hasResults) {
      this.noResults.hide();
      this.optionsList.show();
    } else {
      this.noResults.show();
      this.optionsList.hide();
    }
  }

  destroy() {
    this.wrapper.remove();
    this.select.show();
    $(document).off("click");
  }

  // Public method to refresh options
  refresh() {
    this.populateOptions(this.optionsList);
    this.updateDisplay();
  }

  // Public method to set value programmatically
  setValue(value) {
    this.selectValue(value);
  }

  // Public method to get current value
  getValue() {
    return this.selectedValue;
  }
}

// jQuery plugin wrapper for easy initialization
$.fn.searchableSelect = function (options) {
  return this.each(function () {
    const instance = new SearchableSelect(this, options);
    $(this).data("searchableSelect", instance);
  });
};
