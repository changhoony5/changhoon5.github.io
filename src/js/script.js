require('dotenv').config();
const fs = require('fs');
const { Client } = require('@notionhq/client');
const Chart = require('chart.js');

const databaseId = readDatabaseIdFromEnv();
const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function fetchDataFromNotion(databaseId) {
    try {
        const response = await notion.databases.query({ database_id: databaseId });
        return response.results; // 데이터 가져오기
    } catch (error) {
        console.error("Error fetching data: ", error);
    }
}

async function processData(data) {
    const statusCounts = {
        inProgress: data.filter(item => item.properties.Status.select.name === process.env.INPROGRESS_STATUS_NAME).length,
        carriedOver: data.filter(item => item.properties.Status.select.name === process.env.CARRIED_OVER_STATUS_NAME).length,
        issues: data.filter(item => item.properties.Status.select.name === process.env.ISSUE_STATUS_NAME).length,
        remaining: data.filter(item => item.properties.Status.select.name === process.env.REMAIN_WORK_STATUS_NAME).length,
        total: data.filter(item => item.properties.Status.select.name === process.env.TOTAL_WORK_STATUS_NAME).length,
        completionSum: data.reduce((sum, item) => sum + (item.properties[process.env.COMPLETION_PROPERTY_NAME].number || 0), 0)
    };
    
    return statusCounts;
}

function createPieChart(data) {
  const ctx = document.getElementById('pieChart').getContext('2d');
  const myPieChart = new Chart(ctx, {
      type: 'pie',
      data: {
          labels: ['진행 중 작업', '이월 작업', '이슈 발생'],
          datasets: [{
              data: [data.inProgress, data.carriedOver, data.issues],
              backgroundColor: ['rgba(255, 99, 132)', 'rgba(54, 162, 235)', 'rgba(255, 206, 86)'],
          }]
      },
      options: {
          responsive: true,
          plugins: {
              legend: {
                  position: 'top',
              },
              tooltip: {
                  mode: 'index',
                  intersect: false,
              },
          }
      }
  });
}

async function createXYChart(data) {
    const ctx = document.getElementById('xyChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.sprints,
            datasets: [
                { type: 'bar', label: '진행 중', data: data.ongoing, backgroundColor: 'rgba(255, 99, 132, 0.5)' },
                { type: 'bar', label: '남은 작업', data: data.remaining, backgroundColor: 'rgba(54, 162, 235, 0.5)' },
                { type: 'bar', label: '이월 작업', data: data.carriedOver, backgroundColor: 'rgba(255, 206, 86, 0.5)' },
                { type: 'line', label: '완성도', data: data.completion, borderColor: 'rgba(75, 192, 192, 0.7)', borderWidth: 2 }
            ]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

async function renderCharts() {
  const rawData = await fetchDataFromNotion(databaseId);
  const processedData = await processData(rawData);

  createPieChart(processedData);
  createXYChart(processedData);
}

renderCharts();
