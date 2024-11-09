import 'bulma/css/bulma.min.css';

import './App.css'
import { SampleConfigurationProvider } from './sampleConfigurationProvider.tsx'
import AddSamples from './addSamples.tsx'
import ImportSamples from './importSamples.tsx'
import SampleTable from './sampleTable.tsx'

function App() {

  const sampleCount = 10;

  return (
    <SampleConfigurationProvider>
      <div style={{padding: ".375rem 1rem"}}>
        <h1 className="title">Beamline Sample Set Configuration</h1>

        <h4 className="subtitle is-4">General Information</h4>


        <h4 className="subtitle is-4">Samples</h4>

        <nav className="level">
          <div className="level-left">
            <div className="level-item">
              <div className="field has-addons">
                <div className="control">
                  <input className="input" type="text" placeholder="Search" />
                </div>
              </div>
            </div>
            <div className="level-item">
              <p className="subtitle is-5"><strong>{ sampleCount }</strong> samples</p>
            </div>
            <div className="level-item">
              <ImportSamples />
            </div>
            <div className="level-item">
              <AddSamples />
            </div>
          </div>

          <div className="level-right">
            <div className="level-item">
              <a className="button is-success">Save Changes</a>
            </div>
          </div>
        </nav>

        <SampleTable />
      </div>
   </SampleConfigurationProvider>
  )
}

export default App
