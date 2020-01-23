import React from 'react';
import Select from '@icgc-argo/uikit/form/Select';
import Input from '@icgc-argo/uikit/form/Input';
import styles from './styles.module.css';
import Typography from '@icgc-argo/uikit/Typography';
import startCase from 'lodash/startCase';

const FileFilters = ({ files = 0, fields = 0, filters, activeFilters, setFilters }) => {
  const [searchValue, setSearchValue] = React.useState('');
  const tiers = filters.tiers.map(d => ({ content: startCase(d), value: d }));
  const attributes = filters.attributes.map(d => ({
    content: startCase(d),
    value: d,
  }));
  console.log('tiers', tiers, 'a', attributes);
  return (
    <Typography variant="data" color="#151c3d">
      <div className={styles.fileFilters}>
        {`${files} files > ${fields} fields`}
        <div className={styles.dataSelectors}>
          Data Tier:
          <Select
            options={tiers}
            size="sm"
            onChange={value => setFilters({ ...activeFilters, tier: value })}
            value={activeFilters.tier}
          />
          Attribute:
          <Select
            options={attributes}
            size="sm"
            onChange={value => setFilters({ ...activeFilters, attribute: value })}
            value={activeFilters.attribute}
          />
          <Input
            onChange={e => {
              const val = e.target.value;
              setSearchValue(val);
            }}
            value={searchValue}
            placeholder="Search Dictionary..."
            preset="search"
            className={styles.search}
          />
        </div>
      </div>
    </Typography>
  );
};

export default FileFilters;
