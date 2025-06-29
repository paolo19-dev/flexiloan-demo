
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const loanAmountInput = document.getElementById('loanAmount');
    const loanTermInput = document.getElementById('loanTerm');
    const interestRateInput = document.getElementById('interestRate');
    const variableRateToggle = document.getElementById('variableRateToggle');
    const variableRateSection = document.getElementById('variableRateSection');
    const yearRatesContainer = document.getElementById('yearRatesContainer');
    const calculateBtn = document.getElementById('calculateBtn');
    const monthlyPaymentEl = document.getElementById('monthlyPayment');
    const totalInterestEl = document.getElementById('totalInterest');
    const totalPaymentEl = document.getElementById('totalPayment');
    const scheduleBody = document.getElementById('scheduleBody');
    const paginationContainer = document.getElementById('paginationContainer');
    const exportBtn = document.getElementById('exportBtn');
    const preferenceCards = document.querySelectorAll('.preference-card');
    
    // Input sections
    const standardInputs = document.getElementById('standardInputs');
    const affordabilityInputs = document.getElementById('affordabilityInputs');
    const termInputs = document.getElementById('termInputs');
    
    // State
    let amortizationSchedule = [];
    let currentPage = 1;
    const rowsPerPage = 12;
    let currentPreference = 'standard';
    
    // Initialize variable rate inputs
    function initializeVariableRateInputs() {
        const years = parseInt(loanTermInput.value) || 30;
        yearRatesContainer.innerHTML = '';
        
        for (let i = 1; i <= years; i++) {
            const yearRateDiv = document.createElement('div');
            yearRateDiv.className = 'year-rate';
            yearRateDiv.innerHTML = `
                <label for="yearRate${i}">Year ${i} (%)</label>
                <input type="number" id="yearRate${i}" class="year-rate-input" 
                       min="0.1" step="0.1" value="5.5" placeholder="Rate">
            `;
            yearRatesContainer.appendChild(yearRateDiv);
        }
    }
    
    // Toggle variable rate section
    variableRateToggle.addEventListener('change', function() {
        if (this.checked) {
            variableRateSection.style.display = 'block';
            initializeVariableRateInputs();
        } else {
            variableRateSection.style.display = 'none';
        }
    });
    
    // Update variable rates when loan term changes
    loanTermInput.addEventListener('change', function() {
        if (variableRateToggle.checked) {
            initializeVariableRateInputs();
        }
    });
    
    // Preference selection
    preferenceCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all cards
            preferenceCards.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked card
            this.classList.add('active');
            
            // Update current preference
            currentPreference = this.dataset.preference;
            
            // Show/hide input sections based on preference
            standardInputs.style.display = 'none';
            affordabilityInputs.style.display = 'none';
            termInputs.style.display = 'none';
            
            if (currentPreference === 'standard') {
                standardInputs.style.display = 'block';
            } else if (currentPreference === 'affordability') {
                affordabilityInputs.style.display = 'block';
            } else if (currentPreference === 'term') {
                termInputs.style.display = 'block';
            }
            
            // Recalculate loan
            calculateLoan();
        });
    });
    
    // Calculate loan
    calculateBtn.addEventListener('click', calculateLoan);
    
    // Calculate loan function
    function calculateLoan() {
        const loanAmount = parseFloat(loanAmountInput.value);
        const loanTerm = parseInt(loanTermInput.value);
        const interestRate = parseFloat(interestRateInput.value);
        const isVariable = variableRateToggle.checked;
        const monthlyBudget = parseFloat(document.getElementById('monthlyBudget').value);
        const affordabilityTerm = parseInt(document.getElementById('affordabilityTerm').value);
        const termLoanAmount = parseFloat(document.getElementById('termLoanAmount').value);
        const desiredPayment = parseFloat(document.getElementById('desiredPayment').value);
        
        if (currentPreference === 'standard') {
            if (isNaN(loanAmount) || isNaN(loanTerm) || isNaN(interestRate) || 
                loanAmount <= 0 || loanTerm <= 0 || interestRate <= 0) {
                alert('Please enter valid loan details.');
                return;
            }
            
            if (isVariable) {
                const yearRates = [];
                const inputs = document.querySelectorAll('.year-rate-input');
                
                inputs.forEach(input => {
                    const rate = parseFloat(input.value);
                    if (isNaN(rate) || rate <= 0) {
                        alert('Please enter valid interest rates for all years.');
                        return;
                    }
                    yearRates.push(rate);
                });
                
                amortizationSchedule = calculateVariableRateLoan(loanAmount, loanTerm, yearRates);
            } else {
                amortizationSchedule = calculateFixedRateLoan(loanAmount, loanTerm, interestRate);
            }
        } 
        else if (currentPreference === 'affordability') {
            if (isNaN(monthlyBudget) || isNaN(affordabilityTerm) || isNaN(interestRate) || 
                monthlyBudget <= 0 || affordabilityTerm <= 0 || interestRate <= 0) {
                alert('Please enter valid affordability details.');
                return;
            }
            
            // Calculate loan amount based on affordability
            const loanAmount = calculateLoanAmount(monthlyBudget, affordabilityTerm, interestRate);
            loanAmountInput.value = loanAmount.toFixed(0);
            amortizationSchedule = calculateFixedRateLoan(loanAmount, affordabilityTerm, interestRate);
        }
        else if (currentPreference === 'term') {
            if (isNaN(termLoanAmount) || isNaN(desiredPayment) || isNaN(interestRate) || 
                termLoanAmount <= 0 || desiredPayment <= 0 || interestRate <= 0) {
                alert('Please enter valid term planning details.');
                return;
            }
            
            // Calculate loan term based on desired payment
            const loanTerm = calculateLoanTerm(termLoanAmount, desiredPayment, interestRate);
            loanTermInput.value = loanTerm.toFixed(1);
            amortizationSchedule = calculateFixedRateLoan(termLoanAmount, loanTerm, interestRate);
        }
        
        // Update summary
        updateSummary(amortizationSchedule);
        
        // Render amortization table
        currentPage = 1;
        renderAmortizationTable();
        renderPagination();
    }
    
    // Calculate fixed rate loan
    function calculateFixedRateLoan(amount, years, rate) {
        const schedule = [];
        const monthlyRate = rate / 100 / 12;
        const totalMonths = years * 12;
        
        // Calculate monthly payment
        const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
                              (Math.pow(1 + monthlyRate, totalMonths) - 1);
        
        let balance = amount;
        let totalInterest = 0;
        
        for (let month = 1; month <= totalMonths; month++) {
            const interestPayment = balance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;
            
            totalInterest += interestPayment;
            balance -= principalPayment;
            
            if (balance < 0) balance = 0;
            
            schedule.push({
                month,
                payment: monthlyPayment,
                principal: principalPayment,
                interest: interestPayment,
                totalInterest,
                balance
            });
        }
        
        return schedule;
    }
    
    // Calculate variable rate loan
    function calculateVariableRateLoan(amount, years, yearRates) {
        const schedule = [];
        let balance = amount;
        let totalInterest = 0;
        let month = 1;
        
        for (let year = 0; year < years; year++) {
            // Use the rate for the current year, or the last rate if not specified
            const rate = year < yearRates.length ? yearRates[year] : yearRates[yearRates.length - 1];
            const monthlyRate = rate / 100 / 12;
            
            // Calculate monthly payment for the current year
            const monthsRemaining = (years * 12) - (year * 12);
            const monthlyPayment = balance * (monthlyRate * Math.pow(1 + monthlyRate, monthsRemaining)) / 
                                 (Math.pow(1 + monthlyRate, monthsRemaining) - 1);
            
            // Calculate payments for each month in the year
            for (let m = 0; m < 12 && month <= years * 12; m++, month++) {
                const interestPayment = balance * monthlyRate;
                const principalPayment = monthlyPayment - interestPayment;
                
                totalInterest += interestPayment;
                balance -= principalPayment;
                
                if (balance < 0) balance = 0;
                
                schedule.push({
                    month,
                    payment: monthlyPayment,
                    principal: principalPayment,
                    interest: interestPayment,
                    totalInterest,
                    balance,
                    rateChange: m === 0
                });
            }
        }
        
        return schedule;
    }
    
    // Calculate loan amount based on affordability
    function calculateLoanAmount(monthlyPayment, years, rate) {
        const monthlyRate = rate / 100 / 12;
        const totalMonths = years * 12;
        
        // Present value of annuity formula
        const loanAmount = monthlyPayment * 
                         (1 - Math.pow(1 + monthlyRate, -totalMonths)) / 
                         monthlyRate;
        
        return loanAmount;
    }
    
    // Calculate loan term based on desired payment
    function calculateLoanTerm(loanAmount, monthlyPayment, rate) {
        const monthlyRate = rate / 100 / 12;
        
        // Solve for number of periods
        const n = -Math.log(1 - (loanAmount * monthlyRate) / monthlyPayment) / 
                  Math.log(1 + monthlyRate);
        
        // Convert months to years
        return n / 12;
    }
    
    // Update summary
    function updateSummary(schedule) {
        if (schedule.length === 0) return;
        
        const monthlyPayment = schedule[0].payment;
        const totalInterest = schedule[schedule.length - 1].totalInterest;
        const totalPayment = schedule[0].balance + totalInterest;
        
        monthlyPaymentEl.textContent = formatCurrency(monthlyPayment);
        totalInterestEl.textContent = formatCurrency(totalInterest);
        totalPaymentEl.textContent = formatCurrency(totalPayment);
    }
    
    // Render amortization table
    function renderAmortizationTable() {
        scheduleBody.innerHTML = '';
        
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, amortizationSchedule.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const payment = amortizationSchedule[i];
            const isYearStart = (payment.month % 12 === 1) || payment.month === 1;
            
            const row = document.createElement('tr');
            if (isYearStart) {
                row.classList.add('year-row');
            }
            
            row.innerHTML = `
                <td>${payment.month}</td>
                <td>${formatCurrency(payment.payment)}</td>
                <td>${formatCurrency(payment.principal)}</td>
                <td>${formatCurrency(payment.interest)}</td>
                <td>${formatCurrency(payment.totalInterest)}</td>
                <td>${formatCurrency(payment.balance)}</td>
            `;
            
            scheduleBody.appendChild(row);
        }
    }
    
    // Render pagination
    function renderPagination() {
        paginationContainer.innerHTML = '';
        
        const totalPages = Math.ceil(amortizationSchedule.length / rowsPerPage);
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderAmortizationTable();
                renderPagination();
            }
        });
        paginationContainer.appendChild(prevButton);
        
        // Page buttons
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = startPage + maxButtons - 1;
        
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => {
                currentPage = i;
                renderAmortizationTable();
                renderPagination();
            });
            paginationContainer.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderAmortizationTable();
                renderPagination();
            }
        });
        paginationContainer.appendChild(nextButton);
    }
    
    // Export to CSV
    exportBtn.addEventListener('click', function() {
        if (amortizationSchedule.length === 0) {
            alert('No data to export. Please calculate a loan first.');
            return;
        }
        
        let csvContent = "Month,Payment,Principal,Interest,Total Interest,Balance\n";
        
        amortizationSchedule.forEach(payment => {
            csvContent += `${payment.month},${payment.payment},${payment.principal},${payment.interest},${payment.totalInterest},${payment.balance}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'loan_amortization_schedule.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Helper function to format currency
    function formatCurrency(amount) {
        return '$' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }
    
    // Initialize the calculator with a default calculation
    initializeVariableRateInputs();
    calculateLoan();
});
