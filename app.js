const express = require('express');
const app = express();
const fs = require('fs');
const xmlparser = require('express-xml-bodyparser');
const axios = require("axios")
const xml2js = require ('xml2js')

app.use(express.json());
app.use(xmlparser())
app.use(express.urlencoded({ extended: true }));

app.post('/', async (req, res) => {
  console.log("")
  console.log("Message Received. Processing...")
  console.log("")
  // const jsonData = req.body;

  // if (jsonData === undefined || Object.keys(jsonData).length === 0) {
  //   res.send("Invalid request, expecting JMF from DFE")
  //   console.log("Invalid request, not a DFE JMF")
  //   return
  // }
  const jsonData = {
    jmf: {
      $: {
        xmlns: "http://www.CIP4.org/JDFSchema_1_1",
        MaxVersion: "1.4",
        SenderID: "IN100-Loan6",
        TimeStamp: "2024-03-26T11:21:15-07:00",
        Version: "1.4",
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xsi:type": "JMFRootMessage",
      },
      command: [
        {
          $: {
            ID: "m.79613243._240326_112115395_001972",
            Type: "ReturnQueueEntry",
            "xsi:type": "CommandReturnQueueEntry",
          },
          returnqueueentryparams: [
            {
              $: {
                Completed: "rootNodeId",
                QueueEntryID: "0fa194dd458149beb806bdeaf2d79244",
                URL: "http://192.168.0.118:8080/prodflow/jdf/returnJDFTicket?QueueEntryID=0fa194dd458149beb806bdeaf2d79244",
              },
            },
          ],
        },
      ],
    },
  };
  // console.log('JSON Body:', jsonData);
  const rawJdfURL = jsonData.jmf.command[0].returnqueueentryparams[0].$.URL

  const jdfResponse =  await getJdf(jdfURL)
  writeJDF(jdfResponse)
  extractRelevantData(jdfResponse)
  res.send("Message Received LOUD and clear.")
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

async function getJdf(jdfURL) {
  let res
  await axios.get(jdfURL)
  .then((response) => {
    res = response.data;
  })
  return res
}

function writeJDF(jdfData) {
  fs.writeFile('data.jdf', jdfData, (err) => {
        if (err) {
            return;
        }
    });
}

function extractRelevantData(jdfData) {
  const parseString = xml2js.parseString;
  parseString(jdfData, function (err, result) {
    const printTimeStart = new Date(result.JDF.AuditPool[0].PhaseTime[0].ModulePhase[3]['$'].Start)
    const printTimeEnd = new Date(result.JDF.AuditPool[0].PhaseTime[0].ModulePhase[3]['$'].End)
    const printDuration = (printTimeEnd - printTimeStart) / 1000 / 60
    const mediaName = result.JDF.AuditPool[0].ResourceAudit[9].MediaLink[0].AmountPool[0].PartAmount[0].Part[0]['$'].SheetName
    const mediaAmount = result.JDF.AuditPool[0].ResourceAudit[9].MediaLink[0].AmountPool[0].PartAmount[0]['$'].ActualAmount
    console.log("+-----------------------+")    
    console.log("| " + printDuration.toFixed(2), "minutes on press |")    
    console.log("| " + mediaName, "material \t|")
    console.log("| " + mediaAmount, "sheets \t\t|")
    console.log("+-----------------------+")    
  });
}
