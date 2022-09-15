const axios = require('axios');
const util = require('util');

// ==================================================== //
//    Using an Access Token to Query the HubSpot API    //
// ==================================================== //

// Get Contacts
exports.resContacts = async (accessToken) => {
  const contacts = 'http://api.hubspot.com/crm/v3/objects/contacts';
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const response = await axios.get(contacts, { headers });
  const data = response.data.results;
  return data;
};

exports.apiQueryAndOperations = async (hubspotClient, accessToken) => {
  const objectType = '2-106219468';
  const limit = 10;
  const after = undefined;
  const properties = [
    'date_de_debut_du_contrat',
    'date_releve_kilometrage',
    'duree_du_contrat',
    'date_de_fin_du_contrat',
    'releve_kilometrage',
    'kilometrage_total_prevu_contrat',
  ];
  const propertiesWithHistory = undefined;
  const associations = undefined;
  const archived = false;

  try {
    const apiResponse = await hubspotClient.crm.objects.basicApi.getPage(
      objectType,
      limit,
      after,
      properties,
      propertiesWithHistory,
      associations,
      archived
    );
    let itemCount = 0;
    // All Operations will take place inside the for loop
    for (res of apiResponse.results) {
      // console.log(res.properties);
      console.log(`//======= Object-${itemCount++}========//`);
      const getProgress = (startDate, endDate) => {
        let progress;
        const total = +endDate - +startDate;
        const elaps = Date.now() - startDate;
        // progress = Math.round((elaps / total) * 100) + '%';
        progress = Math.round((elaps / total) * 100);
        if (progress === Infinity) {
          return (progress = 0);
        } else {
          return progress;
        }
      };

      console.log('DATE IS THIS? ', res.properties.date_de_debut_du_contrat);
      let contractStartDate = new Date(res.properties.date_de_debut_du_contrat);
      console.log('Start date: ', res.properties.date_de_debut_du_contrat);
      let contractEndDate = new Date(res.properties.date_de_fin_du_contrat);
      let mileageStatementDate = new Date(
        res.properties.date_releve_kilometrage
      );
      let mileageStatement = parseFloat(res.properties.releve_kilometrage);
      let totalPlannedMileage = res.properties.kilometrage_total_prevu_contrat;
      let contractDuration;
      console.log('DURATION IS: ', res.properties.duree_du_contrat);
      if (parseFloat(res.properties.duree_du_contrat) < 600) {
        contractDuration = parseFloat(res.properties.duree_du_contrat);
      } else {
        contractDuration = 36;
      }
      // Contract Progress
      const contractProgress = getProgress(contractStartDate, contractEndDate);
      console.log('Contract Progress: ', contractProgress) || 0;

      // Get month difference function
      const getMonthDifference = (startDate, endDate) => {
        return (
          endDate.getMonth() -
          startDate.getMonth() +
          12 * (endDate.getFullYear() - startDate.getFullYear())
        );
      };

      console.log(
        'Months difference',
        getMonthDifference(mileageStatementDate, contractEndDate)
      );

      // Get projected Kilometers
      let calcProjectedKMs = (mileageStatement * 100) / contractProgress || 0;
      let projectedKMs = calcProjectedKMs.toFixed(0);

      // Mileage gap between Contract KMs and Projected KMs
      // const calcMileageGap = (projectedKMs / totalPlannedMileage) * 100;
      const calcMileageGap =
        ((projectedKMs - totalPlannedMileage) / totalPlannedMileage) * 100;
      const preMileageGap =
        calcMileageGap - (mileageStatement / totalPlannedMileage) * 100;
      const mileageGap = parseFloat(calcMileageGap.toFixed(0)) || 0;
      console.log('Mileage gap: ', mileageGap);

      // Get mileage gap in kms
      function getDifference(a, b) {
        return Math.abs(a - b);
      }

      let mileageGapInKMs = getDifference(totalPlannedMileage, projectedKMs);
      console.log('Mileage difference: ', mileageGapInKMs);

      // Set end date by month duration
      const endDateByDuration = (startDate, duration) => {
        if (duration) {
          let d = new Date(startDate);
          d.setMonth(d.getMonth() + duration);
          return d.toLocaleDateString('fr-CA');
        } else {
          return null;
        }
      };

      let setEndDate = endDateByDuration(contractStartDate, contractDuration);

      console.log('This is the end date: ', setEndDate);

      // Update Properties
      updateProperty(
        res.id,
        accessToken,
        contractProgress,
        projectedKMs,
        mileageGap,
        mileageGapInKMs,
        setEndDate
      );
    }
  } catch (e) {
    e.message === 'HTTP request failed'
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e);
  }
};

const updateProperty = async (
  id,
  accessToken,
  contractProgress = 0,
  projectedKMs = 0,
  mileageGap = 0,
  mileageGapInKMs = 0,
  endDate
) => {
  let p1 = {
    avancement_du_contrat: `${contractProgress}`,
    km_theorique_fin_de_contrat: `${projectedKMs}`,
    ecart_kilometrage: `${mileageGap}`,
    ecart_kilometrage_en_kms: `${mileageGapInKMs}`,
  };
  let p2 = {
    date_de_fin_du_contrat: `${endDate}`,
  };

  let p3;

  if (endDate) {
    p3 = {
      ...p1,
      ...p2,
    };
  } else {
    p3 = {
      ...p1,
    };
  }

  // console.log('Object: ', p3);

  let payload = JSON.stringify({
    properties: {
      ...p3,
    },
  });
  const config = {
    method: 'patch',
    url: `http://api.hubspot.com/crm/v3/objects/2-106219468/${id}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    data: payload,
  };

  try {
    const response = await axios(config);
    const data = response.data;
    return data;
  } catch (e) {
    console.log(e);
  }
};
