import React, { useState } from 'react';
import { TextField } from '@altinn/altinn-design-system';
import { MoreVertical, Trash2} from 'react-feather';
import { makeStyles } from '@material-ui/core';

type OnIdChangeProps = {
  oldValue: string;
  newValue: string;
};

type OnValueChangeProps = {
  newValue: string;
  translationKey: string;
};

interface ILanguageRowProps {
  translationKey: string;
  transformedLanguages: Record<string, string>;
  onIdChange: ({ oldValue, newValue }: OnIdChangeProps) => void;
  onValueChange: ({newValue, translationKey }: OnValueChangeProps) => void;
  setLanguage: (language: Record<string, string>) => void;
  onTranslationChange: ({ translations }: { translations: Record<string, string> }) => void;
}

export const LanguageRow = ({
  translationKey,
  onIdChange,
  onValueChange,
  transformedLanguages,
  setLanguage,
  onTranslationChange
}: ILanguageRowProps) => {
  const classes = useStyles();
  const [idValue, setIdValue] = useState(translationKey);
  const [valueValue, setValueValue] = useState(transformedLanguages[translationKey]);
  const [isTooltipIsOpen, setIsToolTipOpen] = useState(false);

  const handleOpenTooltip = () => {
    setIsToolTipOpen((prev) => !prev);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setIdValue(newValue);
  };

  const handleIdBlur = () => {
    onIdChange({ oldValue: translationKey, newValue: idValue });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setValueValue(newValue);
  };

  const handleValueBlur = () => {
    onValueChange({ newValue:valueValue, translationKey });
  };

  return (
    <div style={{width:'100%'}}>
      <div style={{width:'100%', display:'flex',gap:'1rem', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{width:'100%'}}>
          <div>
            <label htmlFor={translationKey}>ID</label>
          </div>
          <div>
            <TextField value={idValue} type='text' onBlur={handleIdBlur} onChange={handleIdChange} />
          </div>
        </div>
          <div data-tip data-for="delete" className={classes.moreVertical}>
            <MoreVertical
              onClick={() => {
                handleOpenTooltip();
              }}
            />
        </div>
        <div>
          {isTooltipIsOpen && (
            <div className={classes.tooltipModal}>
              <dialog className={classes.icon} onClick={async () => {
                delete transformedLanguages[translationKey];
                try {
                  onTranslationChange({ translations: transformedLanguages });
                  setLanguage({...transformedLanguages});
                } catch (e) {
                  alert(e.message);
                }
              }}
              >
                <Trash2 />
                Slett
              </dialog>
            </div>
          )}
        </div>
        <div style={{width:'100%', paddingTop:'20px'}}>
          <TextField value={valueValue} type='text' onBlur={handleValueBlur} onChange={handleValueChange} />
        </div>
      </div>
    </div>
  );
};


const useStyles = makeStyles({
  icon: {
    display: "flex",
    justifyContent: "space-around",
    width: "100%",
    alignItems: "center"
  },
  tooltipModal: {
    position: "absolute",
    zIndex: 100,
    display: "flex",
    gap: "1rem",
    flexDirection: "column",
    justifyContent: "space-around",
    alignItems: "center",
    width: "150px",
    height: "80px",
    padding: "0.5rem",
    borderRadius: "3px",
    backgroundColor: "#EFEFEF"
  },
  moreVertical: {
    backgroundColor: "#EFEFEF",
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    display: "flex",
    alignContent: "center",
    justifyContent: "center",
    padding:'5px',
    marginTop:'20px'
  }
})
