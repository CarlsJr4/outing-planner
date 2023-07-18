import { Heading, Text } from '@chakra-ui/react';

import axios from 'axios';
import { useEffect, useState } from 'react';
import LocationInfoType from './types/locationType';
import GeoJsonType from './types/geoJsonType';
import BaseContainer from './components/BaseContainer';
import ZipForm from './components/ZipForm';
import Reccomendations from './components/Reccomendations';
import pickRandomArrayItems from './helpers/pickRandomArrayItems';
import CustomMap from './components/CustomMap';
import './main.css';
import MapType from './types/mapType';

function App() {
  const [zip, setZip] = useState('');
  const [zipError, setZipError] = useState(false);
  const [dateIdeas, setDateIdeas] = useState([] as LocationInfoType[]);
  const [locationCoords, setLocationCoords] = useState<Array<number[]>>([
    [0, 0],
  ]); // Array that holds lat and long for each point of interest
  const [pathData, setPathData] = useState<MapType>({} as MapType);
  const [filteredDateIdeas, setFilteredDateIdeas] = useState(
    [] as LocationInfoType[]
  );
  const [isLoading, setLoading] = useState(false);

  // We can only run the mapbox API once we get the coordinates of the Yelp data. So we use an effect hook.
  useEffect(() => {
    if (filteredDateIdeas.length > 0) {
      const mapboxToken = import.meta.env.VITE_MAPBOX as string;
      const mapboxLocationCoords: Array<number[]> = [];
      let mapboxPathCoords = '';
      filteredDateIdeas.forEach((date, i) => {
        const latitude = date.coordinates.latitude;
        const longitude = date.coordinates.longitude;

        mapboxLocationCoords.push([longitude, latitude]);
        mapboxPathCoords += `${longitude},${latitude}`;
        if (i + 1 < filteredDateIdeas.length) mapboxPathCoords += ';';
      });

      setLocationCoords(mapboxLocationCoords);

      const mapboxEndpoint = `https://api.mapbox.com/directions/v5/mapbox/driving/${mapboxPathCoords}?geometries=geojson&access_token=${mapboxToken}`;
      axios
        .get<GeoJsonType>(mapboxEndpoint)
        .then(res => {
          const data = res.data.routes[0];
          setPathData({
            pathArray: data.geometry.coordinates,
            duration: data.duration,
            distance: data.distance,
          });
        })
        .catch(err => console.log(err));
    }
  }, [filteredDateIdeas]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setZipError(false);
    setFilteredDateIdeas([]);
    if (zip.length !== 5 || isNaN(Number(zip))) {
      setZipError(true);
      return;
    }
    setLoading(true);
    axios
      .get<LocationInfoType[]>('http://localhost:3000/businesses')
      .then(res => {
        setDateIdeas(res.data);
        setFilteredDateIdeas(
          pickRandomArrayItems<LocationInfoType>(res.data, 2)
        );
      })
      .catch(err => console.log(err))
      .finally(() => {
        setLoading(false);
        setZip('');
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZip(e.target.value);
  };

  return (
    <>
      <BaseContainer>
        <Heading>Where to?</Heading>
        <ZipForm
          isZipInvalid={zipError}
          handleSubmit={handleSubmit}
          handleChange={handleChange}
          zip={zip}
          isLoading={isLoading}
        />
      </BaseContainer>
      {filteredDateIdeas.length ? (
        <BaseContainer>
          <Reccomendations
            isLoading={isLoading}
            recommendations={filteredDateIdeas}
            dateIdeas={dateIdeas}
            setFilteredDateIdeas={setFilteredDateIdeas}
          />
        </BaseContainer>
      ) : (
        <BaseContainer>
          <Heading>Almost there!</Heading>
          <Text>
            A recommended itinerary will be generated for you after gathering
            some information.
          </Text>
        </BaseContainer>
      )}
      <BaseContainer>
        <CustomMap pathData={pathData} locationData={locationCoords} />
      </BaseContainer>
    </>
  );
}

export default App;
