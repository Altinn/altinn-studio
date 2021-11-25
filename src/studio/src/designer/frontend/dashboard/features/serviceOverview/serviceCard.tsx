import {
  Card,
  CardActionArea,
  CardContent,
  Grid,
  IconButton,
  Typography,
  makeStyles,
} from '@material-ui/core';
import classNames from 'classnames';
import * as moment from 'moment';
import * as React from 'react';
import TruncateMarkup from 'react-truncate-markup';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { IRepository } from 'app-shared/types';
import ServiceMenu from './serviceMenu';
import { useAppSelector } from 'common/hooks';

export interface IServiceCardProps {
  service: IRepository;
}

const useStyles = makeStyles({
  displayInlineBlock: {
    display: 'inline-block',
  },
  width100: {
    width: '100%',
  },
  card: {
    background: '#EFEFEF',
    borderRadius: '0px',
    height: '154px',
    maxHeight: '154px',
    minHeight: '154px',
    '&:hover': {
      background: '#e5e5e5',
      cursor: 'pointer',
    },
  },
  iconStyling: {
    fontSize: '35px',
    textAlign: 'right',
  },
  avatar: {
    maxHeight: '1.5em',
  },
  textToRight: {
    textAlign: 'right',
  },
  height: {
    height: '70px',
  },
  fontSize_16: {
    fontSize: '16px',
  },
  fontWeight_500: {
    fontWeight: 500,
  },
  fontSize_14: {
    fontSize: '14px',
  },
  ellipsisButton: {
    padding: 0,
    '&:focus': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  },
  ellipsisButtonLabel: {
    margin: '7px',
  },
});

const ellipsisMenuStyle = {
  width: 'auto',
};

export function ServiceCard(props: IServiceCardProps) {
  const { service } = props;
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );

  const openService = () => {
    if (menuAnchorEl !== null) {
      return;
    }
    const repoPath = props.service.full_name;
    if (props.service.is_cloned_to_local) {
      if (repoPath.endsWith('-datamodels')) {
        window.location.assign(`#/datamodelling/${repoPath}`);
      } else {
        window.location.assign(`/designer/${repoPath}`);
      }
    } else {
      window.location.assign(
        `/Home/Index#/clone-app/${props.service.owner.login}/${props.service.name}`,
      );
    }
  };

  const handleIconClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const onMenuClose = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    setMenuAnchorEl(null);
  };

  const formatDate = (date: string): string => {
    return moment(new Date(date)).format('DD.MM.YYYY');
  };

  const iconButtonClasses = React.useMemo(() => {
    return { label: classes.ellipsisButtonLabel };
  }, [classes]);

  return (
    <Card elevation={0} className={classNames(classes.card)}>
      <CardActionArea onClick={openService}>
        <CardContent>
          <Grid container={true} spacing={1} alignItems='center'>
            <Grid item={true} xl={11} lg={11} md={11} sm={11} xs={11}>
              <Typography
                variant='h3'
                className={classNames(
                  classes.width100,
                  classes.fontSize_16,
                  classes.fontWeight_500,
                )}
                noWrap={true}
              >
                {service.name}
              </Typography>
            </Grid>
            <Grid item={true} xl={1} lg={1} md={1} sm={1} xs={1}>
              <IconButton
                className={classes.ellipsisButton}
                id='ellipsis-button'
                onClick={handleIconClick}
                classes={iconButtonClasses}
              >
                <i className='fa fa-ellipsismenu' style={ellipsisMenuStyle} />
              </IconButton>
              <ServiceMenu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={onMenuClose}
                service={service}
              />
            </Grid>
            <Grid
              item={true}
              className={classNames(
                classes.displayInlineBlock,
                classes.width100,
                classes.height,
              )}
            >
              <Typography
                gutterBottom={true}
                className={classNames(classes.width100, classes.fontSize_14)}
              >
                <TruncateMarkup lines={2}>
                  <span>{service.description}</span>
                </TruncateMarkup>
              </Typography>
            </Grid>
          </Grid>
          <Grid container={true} spacing={0} direction='row'>
            <Grid item={true} xl={6} lg={6} md={6} sm={6} xs={6}>
              <Typography
                className={classNames(
                  classes.displayInlineBlock,
                  classes.width100,
                  classes.fontSize_14,
                  classes.fontWeight_500,
                )}
                noWrap={true}
              >
                <img
                  src={service.owner.avatar_url}
                  className={classNames(classes.avatar)}
                  alt=''
                />{' '}
                {service.owner
                  ? service.owner.full_name || service.owner.login
                  : ''}
              </Typography>
            </Grid>
            <Grid item={true} xl={6} lg={6} md={6} sm={6} xs={6}>
              <Typography
                className={classNames(
                  classes.displayInlineBlock,
                  classes.width100,
                  classes.textToRight,
                  classes.fontSize_14,
                  classes.fontWeight_500,
                )}
                noWrap={true}
              >
                {getLanguageFromKey('dashboard.last_changed_service', language)}{' '}
                {formatDate(service.updated_at)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default ServiceCard;
